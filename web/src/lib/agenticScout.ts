/**
 * Agentic public-web scout — multi-wave gather across free sources,
 * then deepen by fetching company site + top result pages.
 * No paid deal DBs; never invents private data as fact.
 */

import { domainMatchesCompany, isBlockedHost, normalizeDomain, sanitizeDomain } from "@/lib/externalLinks";

export type ScoutStepStatus = "pending" | "running" | "done" | "skip" | "error";

export type ScoutStep = {
  id: string;
  label: string;
  detail?: string;
  status: ScoutStepStatus;
  provider?: string;
  hits?: number;
};

export type ScoutSource = {
  title: string;
  url?: string;
  snippet?: string;
  provider: string;
};

export type ScoutNewsItem = {
  title: string;
  url?: string;
  source?: string;
  published?: string;
};

export type ScoutGatherResult = {
  name: string;
  domain?: string;
  aliases: string[];
  snippets: string[];
  sources: ScoutSource[];
  news: ScoutNewsItem[];
  hnHits: { title?: string; url?: string; points?: number; num_comments?: number; objectID?: string }[];
  steps: ScoutStep[];
  wiki?: { title?: string; extract?: string; description?: string; page?: string };
};

type StepCb = (step: ScoutStep) => void;

const UA = "Signal-Thirdbase-AgenticScout/2.0 (+https://thirdbase.vc; research)";

async function fetchJson<T>(url: string, init?: RequestInit, ms = 9000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(ms),
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchText(url: string, ms = 10000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(ms),
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": UA,
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (/image|pdf|octet-stream|video|audio/i.test(ct)) return null;
    const text = await res.text();
    return text.slice(0, 180_000);
  } catch {
    return null;
  }
}

/** True when a chunk is mostly CSS/selectors, not readable prose. */
function looksLikeCss(text: string): boolean {
  const t = text.trim();
  if (t.length < 40) return false;
  const braces = (t.match(/[{}]/g) || []).length;
  const semis = (t.match(/;/g) || []).length;
  const selectors = (t.match(/\.[a-zA-Z_-][\w-]*\s*\{/g) || []).length;
  const props = (t.match(/\b(border|margin|padding|display|font|color|background|width|height)\s*:/gi) || [])
    .length;
  if (selectors >= 2 || props >= 3) return true;
  if (braces >= 4 && semis >= 3) return true;
  const codey = braces + semis;
  return codey > 8 && codey / Math.max(1, t.length) > 0.04;
}

/** Strip tags → readable text for LLM evidence. */
export function htmlToText(html: string): string {
  const raw = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    // Unclosed / truncated style blocks (common on partial fetches)
    .replace(/<style\b[^>]*>[\s\S]*/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Stray CSS rule blobs that leaked past tag stripping
    .replace(/(?:^|[\s;])(?:\.|#)?[a-zA-Z_-][\w-]*(?:\s*\.\s*[a-zA-Z_-][\w-]*)*\s*\{[^}]{0,800}\}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!raw || looksLikeCss(raw)) return "";
  // Drop individual CSS-looking lines while keeping prose
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12 && !looksLikeCss(line))
    .join("\n")
    .trim();
}

function emit(cb: StepCb | undefined, step: ScoutStep) {
  cb?.(step);
}

function pushUnique(sources: ScoutSource[], s: ScoutSource) {
  if (!s.title && !s.snippet) return;
  const key = `${s.provider}|${(s.url || s.title).toLowerCase()}`;
  if (sources.some((x) => `${x.provider}|${(x.url || x.title).toLowerCase()}` === key)) return;
  sources.push(s);
}

function addSnippet(snippets: string[], text: string | undefined | null, cap = 900) {
  const t = (text || "").trim();
  if (t.length < 24) return;
  snippets.push(t.slice(0, cap));
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function flattenDdgTopics(
  topics: unknown,
): { Text?: string; FirstURL?: string }[] {
  const out: { Text?: string; FirstURL?: string }[] = [];
  for (const t of asArray<Record<string, unknown>>(topics)) {
    if (typeof t?.Text === "string") {
      out.push({ Text: t.Text, FirstURL: typeof t.FirstURL === "string" ? t.FirstURL : undefined });
    }
    if (Array.isArray(t?.Topics)) {
      out.push(...flattenDdgTopics(t.Topics));
    }
  }
  return out;
}

type ClearbitHit = {
  name?: string;
  domain?: string;
  logo?: string;
};

type WikiSearch = { pages?: { id: number; title: string; excerpt?: string; description?: string }[] };
type WikiSummary = {
  title?: string;
  extract?: string;
  description?: string;
  content_urls?: { desktop?: { page?: string } };
  type?: string;
};

type DdgResponse = {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: { Text?: string; FirstURL?: string }[];
  Results?: { Text?: string; FirstURL?: string }[];
};

type HnHit = {
  title?: string;
  url?: string;
  points?: number;
  num_comments?: number;
  objectID?: string;
};

/** Wave 1 — resolve identity (domain, wiki, aliases). */
async function waveIdentity(name: string, onStep?: StepCb) {
  emit(onStep, {
    id: "identity",
    label: "Resolving company identity",
    detail: "Clearbit · Wikipedia · DuckDuckGo",
    status: "running",
    provider: "identity",
  });

  const q = encodeURIComponent(name);
  const [clearbit, wikiSearch, ddg] = await Promise.all([
    fetchJson<ClearbitHit[]>(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${q}`,
    ),
    fetchJson<WikiSearch>(
      `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${q}&limit=5`,
    ),
    fetchJson<DdgResponse>(
      `https://api.duckduckgo.com/?q=${q}+company+startup&format=json&no_redirect=1&no_html=1`,
    ),
  ]);

  const aliases = new Set<string>([name]);
  let domain: string | undefined;
  const sources: ScoutSource[] = [];
  const snippets: string[] = [];

  const clearbitHits = asArray<ClearbitHit>(clearbit);
  const needle = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const rankedCb = [...clearbitHits].sort((a, b) => {
    const score = (h: ClearbitHit) => {
      const d = (h.domain || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const n = (h.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      let s = 0;
      if (n === needle) s += 5;
      if (d.startsWith(needle)) s += 4;
      if (n.startsWith(needle) || needle.startsWith(n)) s += 2;
      if (h.domain && domainMatchesCompany(h.domain, name)) s += 6;
      return s;
    };
    return score(b) - score(a);
  });
  for (const hit of rankedCb) {
    if (hit.name) aliases.add(hit.name);
    const candidate = sanitizeDomain(hit.domain, { companyName: name, requireCompanyMatch: true });
    if (!candidate) continue;
    domain = candidate;
    pushUnique(sources, {
      title: `${hit.name || name} · ${domain}`,
      url: `https://${domain}`,
      snippet: `Domain resolved via Clearbit suggest`,
      provider: "clearbit",
    });
    break;
  }

  let wiki: ScoutGatherResult["wiki"];
  const wikiTitle =
    wikiSearch?.pages?.find((p) => /compan|startup|software|technolog|inc\.?/i.test(
      `${p.description || ""} ${p.excerpt || ""}`,
    ))?.title ||
    wikiSearch?.pages?.[0]?.title ||
    name;

  const wikiSummary = await fetchJson<WikiSummary>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle.replace(/\s+/g, "_"))}`,
  );
  if (wikiSummary?.extract && wikiSummary.type !== "disambiguation") {
    wiki = {
      title: wikiSummary.title,
      extract: wikiSummary.extract,
      description: wikiSummary.description,
      page: wikiSummary.content_urls?.desktop?.page,
    };
    if (wikiSummary.title) aliases.add(wikiSummary.title);
    addSnippet(snippets, wikiSummary.extract, 1200);
    pushUnique(sources, {
      title: wikiSummary.title || `${name} — Wikipedia`,
      url: wiki?.page,
      snippet: wikiSummary.extract.slice(0, 320),
      provider: "wikipedia",
    });
  }

  if (ddg?.AbstractText) {
    addSnippet(snippets, ddg.AbstractText);
    pushUnique(sources, {
      title: ddg.Heading || `${name} — DuckDuckGo`,
      url: ddg.AbstractURL,
      snippet: ddg.AbstractText.slice(0, 320),
      provider: "duckduckgo",
    });
    if (!domain && ddg.AbstractURL) {
      try {
        const host = new URL(ddg.AbstractURL).hostname.replace(/^www\./, "");
        const candidate = sanitizeDomain(host, { companyName: name, requireCompanyMatch: true });
        if (candidate) domain = candidate;
      } catch {
        /* ignore */
      }
    }
  }
  for (const topic of flattenDdgTopics(ddg?.RelatedTopics).slice(0, 6)) {
    if (topic.Text) {
      addSnippet(snippets, topic.Text, 400);
      pushUnique(sources, {
        title: topic.Text.slice(0, 90),
        url: topic.FirstURL,
        snippet: topic.Text,
        provider: "duckduckgo",
      });
    }
  }

  const hits =
    clearbitHits.length + (wiki ? 1 : 0) + (ddg?.AbstractText ? 1 : 0);
  emit(onStep, {
    id: "identity",
    label: "Identity resolved",
    detail: domain
      ? `Domain ${domain}${wiki ? " · Wikipedia hit" : ""}`
      : wiki
        ? "Wikipedia hit · domain still unknown"
        : "Thin identity — continuing broad sweep",
    status: "done",
    provider: "identity",
    hits,
  });

  return { domain, aliases: [...aliases], sources, snippets, wiki };
}

/** Wave 2 — parallel public indexes. */
async function waveBroadWeb(
  name: string,
  domain: string | undefined,
  onStep?: StepCb,
) {
  emit(onStep, {
    id: "broad",
    label: "Sweeping public indexes",
    detail: "HN · Reddit · GitHub · News · SEC · funding queries",
    status: "running",
    provider: "web",
  });

  const q = encodeURIComponent(name);
  const fundingQ = encodeURIComponent(`${name} funding OR raised OR Series OR valuation`);
  const sources: ScoutSource[] = [];
  const snippets: string[] = [];
  const news: ScoutNewsItem[] = [];
  let hnHits: HnHit[] = [];

  const [
    hn,
    reddit,
    github,
    newsRss,
    sec,
    ddgFunding,
    wikiCompany,
  ] = await Promise.all([
    fetchJson<{ hits?: HnHit[] }>(
      `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=8`,
    ),
    fetchJson<{
      data?: {
        children?: {
          data?: { title?: string; selftext?: string; url?: string; subreddit?: string; score?: number };
        }[];
      };
    }>(`https://www.reddit.com/search.json?q=${q}&sort=relevance&limit=8&type=link`, {
      headers: { "User-Agent": UA },
    }),
    fetchJson<{
      items?: { full_name?: string; html_url?: string; description?: string; stargazers_count?: number }[];
    }>(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`${name} in:name,description`)}&per_page=5&sort=stars`,
      { headers: { Accept: "application/vnd.github+json", "User-Agent": UA } },
    ),
    fetchText(
      `https://news.google.com/rss/search?q=${fundingQ}&hl=en-US&gl=US&ceid=US:en`,
      10000,
    ),
    fetchJson<{
      hits?: { _source?: { display_names?: string[]; file_description?: string; adsh?: string } }[];
    }>(
      `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(name)}%22&dateRange=custom&startdt=2018-01-01&forms=D,10-K,10-Q,S-1,424B`,
      { headers: { Accept: "application/json", "User-Agent": UA } },
      12000,
    ).catch(() => null),
    fetchJson<DdgResponse>(
      `https://api.duckduckgo.com/?q=${fundingQ}&format=json&no_redirect=1&no_html=1`,
    ),
    domain
      ? fetchJson<WikiSummary>(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/\s+/g, "_"))}`,
        )
      : Promise.resolve(null),
  ]);

  hnHits = asArray<HnHit>(hn?.hits);
  for (const hit of hnHits) {
    if (!hit.title) continue;
    const snippet = `${hit.title} (${hit.points || 0} pts, ${hit.num_comments || 0} comments)`;
    addSnippet(snippets, snippet, 280);
    pushUnique(sources, {
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      snippet,
      provider: "hackernews",
    });
  }

  for (const child of asArray<{ data?: { title?: string; selftext?: string; url?: string; subreddit?: string; score?: number } }>(
    reddit?.data?.children,
  )) {
    const d = child.data;
    if (!d?.title) continue;
    const body = [d.title, d.selftext?.slice(0, 400)].filter(Boolean).join(" — ");
    addSnippet(snippets, `Reddit r/${d.subreddit}: ${body}`, 500);
    pushUnique(sources, {
      title: d.title,
      url: d.url,
      snippet: body.slice(0, 280),
      provider: "reddit",
    });
  }

  for (const repo of asArray<{
    full_name?: string;
    html_url?: string;
    description?: string;
    stargazers_count?: number;
  }>(github?.items)) {
    if (!repo.full_name) continue;
    const sn = `${repo.full_name} ★${repo.stargazers_count || 0}: ${repo.description || ""}`;
    addSnippet(snippets, sn, 400);
    pushUnique(sources, {
      title: repo.full_name,
      url: repo.html_url,
      snippet: sn,
      provider: "github",
    });
  }

  if (newsRss) {
    const items = [...newsRss.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 10);
    for (const m of items) {
      const block = m[1];
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
      const link = block.match(/<link>(.*?)<\/link>/i);
      const source = block.match(/<source[^>]*>(.*?)<\/source>/i);
      const pub = block.match(/<pubDate>(.*?)<\/pubDate>/i);
      const t = (title?.[1] || title?.[2] || "").trim();
      if (!t) continue;
      const url = (link?.[1] || "").trim();
      news.push({
        title: t,
        url: url || undefined,
        source: source?.[1],
        published: pub?.[1],
      });
      addSnippet(snippets, `News: ${t}${source?.[1] ? ` (${source[1]})` : ""}`, 320);
      pushUnique(sources, {
        title: t,
        url: url || undefined,
        snippet: t,
        provider: "news",
      });
    }
  }

  const secHits = asArray<{
    _source?: { display_names?: string[]; file_description?: string; adsh?: string };
  }>(sec && typeof sec === "object" ? (sec as { hits?: unknown }).hits : null);
  for (const hit of secHits.slice(0, 5)) {
    const s = hit._source;
    if (!s) continue;
    const label = asArray<string>(s.display_names).join(", ") || "SEC filing";
    const sn = `SEC ${s.file_description || "filing"}: ${label}`;
    addSnippet(snippets, sn, 360);
    pushUnique(sources, {
      title: sn.slice(0, 100),
      url: `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(name)}`,
      snippet: sn,
      provider: "sec",
    });
  }

  if (ddgFunding?.AbstractText) {
    addSnippet(snippets, ddgFunding.AbstractText);
    pushUnique(sources, {
      title: ddgFunding.Heading || `${name} funding`,
      url: ddgFunding.AbstractURL,
      snippet: ddgFunding.AbstractText.slice(0, 280),
      provider: "duckduckgo",
    });
  }
  for (const topic of flattenDdgTopics(ddgFunding?.RelatedTopics).slice(0, 5)) {
    if (!topic.Text) continue;
    addSnippet(snippets, topic.Text, 360);
    pushUnique(sources, {
      title: topic.Text.slice(0, 90),
      url: topic.FirstURL,
      snippet: topic.Text,
      provider: "duckduckgo",
    });
  }

  if (wikiCompany?.extract) {
    addSnippet(snippets, wikiCompany.extract, 800);
  }

  const hitCount =
    hnHits.length +
    asArray(reddit?.data?.children).length +
    asArray(github?.items).length +
    news.length +
    secHits.length;

  emit(onStep, {
    id: "broad",
    label: "Public indexes complete",
    detail: `${hitCount} signals · ${news.length} news · ${hnHits.length} HN`,
    status: "done",
    provider: "web",
    hits: hitCount,
  });

  return { sources, snippets, news, hnHits };
}

/** Wave 3 — crawl company site + top pages for depth. */
async function waveDeepFetch(
  name: string,
  domain: string | undefined,
  candidateUrls: string[],
  onStep?: StepCb,
) {
  emit(onStep, {
    id: "deep",
    label: "Fetching primary pages",
    detail: domain ? `Site ${domain} + top sources` : "Top sources (no domain yet)",
    status: "running",
    provider: "crawl",
  });

  const sources: ScoutSource[] = [];
  const snippets: string[] = [];
  const urls: string[] = [];

  if (domain) {
    const clean = normalizeDomain(domain);
    if (!clean || isBlockedHost(clean) || !domainMatchesCompany(clean, name)) {
      domain = undefined;
    } else {
      domain = clean;
      urls.push(`https://${domain}`, `https://${domain}/about`, `https://www.${domain}`);
    }
  }
  for (const u of candidateUrls) {
    if (!u || !/^https?:\/\//i.test(u)) continue;
    if (/wikipedia\.org|reddit\.com|google\.com|duckduckgo|github\.com\/search/i.test(u)) continue;
    if (!urls.includes(u)) urls.push(u);
  }

  const unique = urls.slice(0, 8);
  const pages = await Promise.all(
    unique.map(async (url) => {
      const html = await fetchText(url, 12000);
      if (!html) return null;
      const text = htmlToText(html);
      if (text.length < 80) return null;
      return { url, text };
    }),
  );

  let fetched = 0;
  for (const page of pages) {
    if (!page) continue;
    fetched += 1;
    const slice = page.text.slice(0, 3500);
    addSnippet(snippets, `PAGE ${page.url}:\n${slice}`, 3600);
    pushUnique(sources, {
      title: `Fetched ${page.url.replace(/^https?:\/\//, "").split("/")[0]}`,
      url: page.url,
      snippet: page.text.slice(0, 280),
      provider: "site",
    });
  }

  // Product / careers hints from homepage text
  const blob = snippets.join("\n");
  if (/careers|we're hiring|join (our|the) team|open roles/i.test(blob)) {
    addSnippet(snippets, `${name} appears to be actively hiring (careers language on site).`, 200);
  }

  emit(onStep, {
    id: "deep",
    label: fetched ? "Primary pages fetched" : "Deep fetch thin",
    detail: fetched
      ? `Extracted text from ${fetched} page(s)`
      : "Could not fetch site pages — relying on index snippets",
    status: fetched ? "done" : "skip",
    provider: "crawl",
    hits: fetched,
  });

  return { sources, snippets, fetched };
}

/**
 * Full agentic gather: identity → broad web → deep crawl.
 * Calls onStep for live UI progress.
 */
export async function gatherAgenticSignals(
  name: string,
  onStep?: StepCb,
): Promise<ScoutGatherResult> {
  const steps: ScoutStep[] = [];
  const track: StepCb = (s) => {
    const i = steps.findIndex((x) => x.id === s.id);
    if (i >= 0) steps[i] = s;
    else steps.push(s);
    onStep?.(s);
  };

  emit(track, {
    id: "start",
    label: "Starting agentic scout",
    detail: `Target: ${name}`,
    status: "running",
    provider: "agent",
  });

  const identity = await waveIdentity(name, track);
  const broad = await waveBroadWeb(name, identity.domain, track);

  const candidateUrls = [
    ...identity.sources.map((s) => s.url).filter(Boolean),
    ...broad.sources.map((s) => s.url).filter(Boolean),
    ...broad.news.map((n) => n.url).filter(Boolean),
  ].filter((u): u is string => Boolean(u));

  const deep = await waveDeepFetch(name, identity.domain, candidateUrls, track);

  const sources: ScoutSource[] = [];
  for (const s of [...identity.sources, ...broad.sources, ...deep.sources]) {
    pushUnique(sources, s);
  }

  const snippets = [...identity.snippets, ...broad.snippets, ...deep.snippets];

  emit(track, {
    id: "start",
    label: "Scout gather complete",
    detail: `${sources.length} sources · ${snippets.length} evidence blocks`,
    status: "done",
    provider: "agent",
    hits: sources.length,
  });

  return {
    name,
    domain: identity.domain
      ? sanitizeDomain(identity.domain, { companyName: name, requireCompanyMatch: true }) || undefined
      : undefined,
    aliases: identity.aliases,
    snippets,
    sources,
    news: broad.news,
    hnHits: broad.hnHits,
    steps,
    wiki: identity.wiki,
  };
}
