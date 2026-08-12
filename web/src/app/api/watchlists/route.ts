import { NextResponse } from "next/server";
import { restMutate, restSelect } from "@/lib/rest";
import type { WatchlistItem } from "@/lib/watchlists";

export const dynamic = "force-dynamic";

const META_KEY = "partner_watchlists";

type MetaMap = Record<string, Omit<WatchlistItem, "partner_name">[]>;

function normalizePartner(name?: string | null) {
  return (name || "Partner").trim() || "Partner";
}

function sortItems(items: WatchlistItem[]): WatchlistItem[] {
  return [...items].sort((a, b) => (a.rank || 999) - (b.rank || 999));
}

function buildOverlap(byPartner: Record<string, WatchlistItem[]>) {
  const map: Record<string, string[]> = {};
  for (const [partner, items] of Object.entries(byPartner)) {
    for (const it of items) {
      if (!it.company_id) continue;
      if (!map[it.company_id]) map[it.company_id] = [];
      if (!map[it.company_id].includes(partner)) map[it.company_id].push(partner);
    }
  }
  return map;
}

async function loadMeta(): Promise<MetaMap> {
  try {
    const rows = await restSelect<{ value: string }[]>("meta", {
      eq: { key: META_KEY },
      limit: 1,
    });
    const raw = rows?.[0]?.value;
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MetaMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveMeta(map: MetaMap) {
  await restMutate("meta", {
    method: "POST",
    upsert: true,
    onConflict: "key",
    body: [{ key: META_KEY, value: JSON.stringify(map) }],
  });
}

function flattenMeta(map: MetaMap): WatchlistItem[] {
  const out: WatchlistItem[] = [];
  for (const [partner, items] of Object.entries(map)) {
    for (const it of items || []) {
      if (!it?.company_id) continue;
      out.push({
        partner_name: partner,
        company_id: it.company_id,
        rank: Number(it.rank) || 999,
        note: it.note ?? null,
        source: it.source ?? "ui",
        added_at: it.added_at ?? null,
        updated_at: it.updated_at ?? null,
      });
    }
  }
  return out;
}

async function loadAllItems(): Promise<{ items: WatchlistItem[]; source: string }> {
  try {
    const rows = await restSelect<WatchlistItem[]>("partner_watchlist_items", {
      order: "rank.asc",
    });
    if (Array.isArray(rows) && rows.length) {
      return { items: rows, source: "table" };
    }
  } catch {
    // table may not exist yet
  }
  const meta = await loadMeta();
  return { items: flattenMeta(meta), source: "meta" };
}

function groupByPartner(items: WatchlistItem[]): Record<string, WatchlistItem[]> {
  const by: Record<string, WatchlistItem[]> = {};
  for (const it of items) {
    const p = it.partner_name || "Partner";
    if (!by[p]) by[p] = [];
    by[p].push(it);
  }
  for (const p of Object.keys(by)) by[p] = sortItems(by[p]);
  return by;
}

function snapshot(partnerName: string, items: WatchlistItem[], source: string) {
  const by_partner = groupByPartner(items);
  const partner_items = by_partner[partnerName] || [];
  return {
    ok: true as const,
    partner_name: partnerName,
    items: partner_items,
    by_partner,
    overlap: buildOverlap(by_partner),
    source,
  };
}

async function syncPartnerToStores(
  partnerName: string,
  items: WatchlistItem[],
): Promise<string> {
  const now = new Date().toISOString();
  const normalized = sortItems(items).map((it, i) => ({
    partner_name: partnerName,
    company_id: it.company_id,
    rank: i + 1,
    note: it.note ?? null,
    source: it.source || "ui",
    added_at: it.added_at || now,
    updated_at: now,
  }));

  const meta = await loadMeta();
  meta[partnerName] = normalized.map(({ partner_name: _p, ...rest }) => rest);
  await saveMeta(meta);

  let source = "meta";
  try {
    // Delete removed rows then upsert current set
    const existing = await restSelect<WatchlistItem[]>("partner_watchlist_items", {
      eq: { partner_name: partnerName },
    }).catch(() => [] as WatchlistItem[]);
    const keep = new Set(normalized.map((n) => n.company_id));
    for (const row of existing || []) {
      if (row.company_id && !keep.has(row.company_id)) {
        await restMutate("partner_watchlist_items", {
          method: "DELETE",
          eq: { partner_name: partnerName, company_id: row.company_id },
          prefer: "return=minimal",
        }).catch(() => null);
      }
    }
    if (normalized.length) {
      await restMutate("partner_watchlist_items", {
        method: "POST",
        upsert: true,
        onConflict: "partner_name,company_id",
        body: normalized,
      });
    }
    source = "table";
  } catch {
    // meta already saved
  }
  return source;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const partner = normalizePartner(url.searchParams.get("partner"));
    const { items, source } = await loadAllItems();
    return NextResponse.json(snapshot(partner, items, source));
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load watchlists" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: string;
      partner_name?: string;
      company_id?: string;
      note?: string | null;
      source?: string;
      ranked?: string[];
      dir?: -1 | 1;
      company_ids?: string[];
    };

    const partner = normalizePartner(body.partner_name);
    const action = (body.action || "toggle").toLowerCase();
    const { items } = await loadAllItems();
    const by = groupByPartner(items);
    let partnerItems = [...(by[partner] || [])];
    const now = new Date().toISOString();

    if (action === "toggle" || action === "add" || action === "remove") {
      const companyId = (body.company_id || "").trim();
      if (!companyId) {
        return NextResponse.json({ ok: false, error: "company_id required" }, { status: 400 });
      }
      const idx = partnerItems.findIndex((i) => i.company_id === companyId);
      const wantsRemove =
        action === "remove" || (action === "toggle" && idx >= 0);
      if (wantsRemove) {
        partnerItems = partnerItems.filter((i) => i.company_id !== companyId);
      } else if (idx < 0) {
        partnerItems.push({
          partner_name: partner,
          company_id: companyId,
          rank: partnerItems.length + 1,
          note: body.note ?? null,
          source: body.source || "ui",
          added_at: now,
          updated_at: now,
        });
      } else if (body.note !== undefined) {
        partnerItems[idx] = {
          ...partnerItems[idx],
          note: body.note,
          updated_at: now,
        };
      }
    } else if (action === "set_note") {
      const companyId = (body.company_id || "").trim();
      if (!companyId) {
        return NextResponse.json({ ok: false, error: "company_id required" }, { status: 400 });
      }
      const idx = partnerItems.findIndex((i) => i.company_id === companyId);
      if (idx < 0) {
        partnerItems.push({
          partner_name: partner,
          company_id: companyId,
          rank: partnerItems.length + 1,
          note: body.note ?? null,
          source: body.source || "ui",
          added_at: now,
          updated_at: now,
        });
      } else {
        partnerItems[idx] = {
          ...partnerItems[idx],
          note: body.note ?? null,
          updated_at: now,
        };
      }
    } else if (action === "move") {
      const companyId = (body.company_id || "").trim();
      const dir = body.dir === 1 || body.dir === -1 ? body.dir : 0;
      if (!companyId || !dir) {
        return NextResponse.json(
          { ok: false, error: "company_id and dir (-1|1) required" },
          { status: 400 },
        );
      }
      const ranked = sortItems(partnerItems).map((i) => i.company_id);
      const i = ranked.indexOf(companyId);
      const j = i + dir;
      if (i >= 0 && j >= 0 && j < ranked.length) {
        const next = [...ranked];
        [next[i], next[j]] = [next[j], next[i]];
        const map = new Map(partnerItems.map((it) => [it.company_id, it]));
        partnerItems = next.map((id, rank) => ({
          ...(map.get(id) || {
            partner_name: partner,
            company_id: id,
            note: null,
            source: "ui",
            added_at: now,
          }),
          partner_name: partner,
          company_id: id,
          rank: rank + 1,
          updated_at: now,
        }));
      }
    } else if (action === "replace_ranks" || action === "migrate") {
      const ranked = Array.isArray(body.ranked)
        ? body.ranked
        : Array.isArray(body.company_ids)
          ? body.company_ids
          : [];
      const uniq = Array.from(new Set(ranked.filter(Boolean)));
      const map = new Map(partnerItems.map((it) => [it.company_id, it]));
      partnerItems = uniq.map((id, rank) => ({
        ...(map.get(id) || {
          partner_name: partner,
          company_id: id,
          note: null,
          source: action === "migrate" ? "migrated" : "ui",
          added_at: now,
        }),
        partner_name: partner,
        company_id: id,
        rank: rank + 1,
        updated_at: now,
      }));
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: "action must be toggle|add|remove|set_note|move|replace_ranks|migrate",
        },
        { status: 400 },
      );
    }

    const source = await syncPartnerToStores(partner, partnerItems);
    const all = await loadAllItems();
    // Prefer freshly written partner items in response
    const merged = all.items.filter((i) => i.partner_name !== partner).concat(
      sortItems(partnerItems).map((it, i) => ({ ...it, rank: i + 1, partner_name: partner })),
    );
    return NextResponse.json(snapshot(partner, merged, source));
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to update watchlist" },
      { status: 500 },
    );
  }
}
