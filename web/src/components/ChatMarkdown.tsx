"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { sanitizeSourceUrl } from "@/lib/externalLinks";

type Props = {
  content: string;
  onSuggestion?: (text: string) => void;
  className?: string;
};

const FIELD_LABELS =
  /^(Consensus|Evidence|Best companies|Parent theme|Why|Why ThirdBase|Pre-consensus|Action|Kill risk|Ask|Next question|Status|Heat|Stealth|Channels?|Sources?|Opening|Counsel|Detail|Horizon|Posture|Theme|Risk|Next|Mode|Observed mix|Band|Alarm|Target|Rec|Score|Stage|Sector|Thesis|Partners?|Round|Check|Ownership|Kill|Watch|Call|Path|Warm path|Intro|Firm|Drift|Heatmap|Syn|Last|Notes|Detail|Summary):\s*(.*)$/i;

function splitSources(raw: string): { body: string; sources: string | null } {
  const text = raw.replace(/^\s*\n+/, "").trimEnd();
  const m = text.match(/(?:^|\n)---\s*\n+_?Sources:\s*(.+?)_?\s*(?:\n|$)/i);
  if (!m || m.index == null) {
    const inline = text.match(/^_?Sources:\s*(.+?)_?\s*\n+/i);
    if (inline) {
      return {
        body: text.slice(inline[0].length).trim(),
        sources: inline[1].trim().replace(/_+$/, ""),
      };
    }
    return { body: text, sources: null };
  }
  const sources = m[1].trim().replace(/_+$/, "");
  const before = text.slice(0, m.index).trim();
  const after = text.slice(m.index + m[0].length).trim();
  return { body: [before, after].filter(Boolean).join("\n\n"), sources };
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)]+\)|\/[a-z][\w/-]*|_([^_\n]+)_|\*([^*\n]+)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${i++}`}>{text.slice(last, match.index)}</Fragment>,
      );
    }
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i++}`} className="chat-md-strong">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-c-${i++}`} className="chat-md-code">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const lm = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (lm) {
        const href = lm[2];
        const internal = href.startsWith("/");
        const safeExternal = internal ? null : sanitizeSourceUrl(href);
        nodes.push(
          internal ? (
            <Link key={`${keyPrefix}-a-${i++}`} href={href} className="chat-md-link">
              {lm[1]}
            </Link>
          ) : safeExternal ? (
            <a
              key={`${keyPrefix}-a-${i++}`}
              href={safeExternal}
              target="_blank"
              rel="noreferrer noopener"
              className="chat-md-link"
            >
              {lm[1]}
            </a>
          ) : (
            <span key={`${keyPrefix}-a-${i++}`} className="chat-md-link opacity-70">
              {lm[1]}
            </span>
          ),
        );
      }
    } else if (token.startsWith("/")) {
      nodes.push(
        <Link key={`${keyPrefix}-p-${i++}`} href={token} className="chat-md-link mono">
          {token}
        </Link>,
      );
    } else if (token.startsWith("_") || token.startsWith("*")) {
      nodes.push(
        <em key={`${keyPrefix}-i-${i++}`} className="chat-md-em">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-t-${i++}`}>{text.slice(last)}</Fragment>);
  }
  return nodes;
}

function suggestionLabel(line: string): string | null {
  const cleaned = line
    .replace(/^[-*•]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/_/g, "")
    .replace(/\s*\/\s*.+$/, "")
    .trim();
  if (cleaned.length < 4 || cleaned.length > 64) return null;
  if (/[.!?]$/.test(cleaned) && cleaned.length > 40) return null;
  return cleaned;
}

function isBlockStart(trimmed: string): boolean {
  return (
    !trimmed ||
    /^#{1,3}\s/.test(trimmed) ||
    /^[-*•]\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed) ||
    /^---+$/.test(trimmed) ||
    FIELD_LABELS.test(trimmed) ||
    /^>\s?/.test(trimmed)
  );
}

function splitListValue(label: string, value: string): string[] | null {
  const key = label.toLowerCase();
  if (!/evidence|best companies|channels?|partners?|themes?/.test(key)) return null;
  if (value.includes(";")) {
    return value
      .split(/\s*;\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (/best companies|partners?/.test(key) && value.includes(",")) {
    const parts = value
      .split(/\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) return parts;
  }
  if (/ · /.test(value) && /channels?|evidence/.test(key)) {
    const parts = value
      .split(/\s*·\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 3) return parts;
  }
  return null;
}

function FieldValue({
  label,
  value,
  keyPrefix,
}: {
  label: string;
  value: string;
  keyPrefix: string;
}) {
  const parts = splitListValue(label, value);
  if (parts) {
    return (
      <ul className="chat-md-field-list">
        {parts.map((p, i) => (
          <li key={`${keyPrefix}-fv-${i}`}>{renderInline(p, `${keyPrefix}-fv${i}`)}</li>
        ))}
      </ul>
    );
  }
  return <span className="chat-md-field-value">{renderInline(value, keyPrefix)}</span>;
}

export function ChatMarkdown({ content, onSuggestion, className }: Props) {
  const { body, sources } = splitSources(content);
  const lines = body.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let bi = 0;
  let leadUsed = false;
  let sectionKids: ReactNode[] | null = null;
  let sectionKey = 0;

  const push = (node: ReactNode) => {
    if (sectionKids) sectionKids.push(node);
    else blocks.push(node);
  };

  const flushSection = () => {
    if (!sectionKids) return;
    blocks.push(
      <section key={`sec-${sectionKey++}`} className="chat-md-section">
        {sectionKids}
      </section>,
    );
    sectionKids = null;
  };

  const startSection = (heading: ReactNode) => {
    flushSection();
    sectionKids = [heading];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushSection();
      push(<hr key={`hr-${bi++}`} className="chat-md-hr" />);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      push(
        <blockquote key={`bq-${bi++}`} className="chat-md-quote">
          {renderInline(quote.join(" "), `bq${bi}`)}
        </blockquote>,
      );
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = (level === 1 ? "h2" : level === 2 ? "h3" : "h4") as "h2" | "h3" | "h4";
      const title = heading[2].replace(/^\d+\.\s+/, "");
      const num = heading[2].match(/^(\d+)\.\s+/);
      const node = (
        <Tag key={`h-${bi++}`} className={cn("chat-md-h", `chat-md-h${level}`)}>
          {num ? <span className="chat-md-num">{num[1]}</span> : null}
          {renderInline(title, `h${bi}`)}
        </Tag>
      );
      if (level >= 3) startSection(node);
      else {
        flushSection();
        push(node);
      }
      i += 1;
      continue;
    }

    const field = trimmed.match(FIELD_LABELS);
    if (field) {
      const fields: { label: string; value: string }[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) {
          i += 1;
          break;
        }
        const fm = t.match(FIELD_LABELS);
        if (!fm) break;
        fields.push({ label: fm[1], value: fm[2].trim() });
        i += 1;
      }
      push(
        <dl key={`dl-${bi++}`} className="chat-md-fields">
          {fields.map((f, fi) => (
            <div key={`${f.label}-${fi}`} className="chat-md-field">
              <dt className="chat-md-field-label">{f.label}</dt>
              <dd className="chat-md-field-body">
                <FieldValue label={f.label} value={f.value} keyPrefix={`f${bi}-${fi}`} />
              </dd>
            </div>
          ))}
        </dl>,
      );
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i += 1;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^[-*•]\s+/.test(lines[i].trim())) {
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i += 1;
        }
      }
      const asSuggestions =
        !!onSuggestion &&
        items.length >= 2 &&
        items.length <= 8 &&
        items.every((it) => /^\*\*[^*]+/.test(it.trim()));

      if (asSuggestions) {
        push(
          <div key={`sug-${bi++}`} className="chat-md-suggestions">
            {items.map((it, ii) => {
              const label = suggestionLabel(it) || it.replace(/\*\*/g, "");
              return (
                <button
                  key={`${label}-${ii}`}
                  type="button"
                  className="chat-md-suggestion"
                  onClick={() => onSuggestion?.(label)}
                >
                  {label}
                </button>
              );
            })}
          </div>,
        );
      } else {
        push(
          <ul key={`ul-${bi++}`} className="chat-md-ul">
            {items.map((it, ii) => {
              const nestedField = it.match(/^\*\*([^*]+)\*\*\s*[·:—-]\s*(.+)$/);
              if (nestedField) {
                return (
                  <li key={`li-${ii}`} className="chat-md-li-rich">
                    <span className="chat-md-li-label">{nestedField[1]}</span>
                    <span className="chat-md-li-rest">
                      {renderInline(nestedField[2], `li${bi}-${ii}`)}
                    </span>
                  </li>
                );
              }
              return <li key={`li-${ii}`}>{renderInline(it, `li${bi}-${ii}`)}</li>;
            })}
          </ul>,
        );
      }
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: { title: string; body: string[] }[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const title = lines[i].trim().replace(/^\d+\.\s+/, "");
        const bodyLines: string[] = [];
        i += 1;
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^\d+\.\s+/.test(lines[i].trim()) &&
          !/^#{1,3}\s/.test(lines[i].trim()) &&
          !/^---+$/.test(lines[i].trim())
        ) {
          bodyLines.push(lines[i].trim());
          i += 1;
        }
        items.push({ title, body: bodyLines });
      }
      push(
        <ol key={`ol-${bi++}`} className="chat-md-ol chat-md-ol-cards">
          {items.map((it, ii) => (
            <li key={`oli-${ii}`} className="chat-md-ol-card">
              <div className="chat-md-ol-title">{renderInline(it.title, `olt${bi}-${ii}`)}</div>
              {it.body.length > 0 ? (
                <div className="chat-md-ol-body">
                  {it.body.map((bl, bi2) => {
                    const fm = bl.match(FIELD_LABELS);
                    if (fm) {
                      return (
                        <div key={`olf-${ii}-${bi2}`} className="chat-md-field">
                          <span className="chat-md-field-label">{fm[1]}</span>
                          <FieldValue
                            label={fm[1]}
                            value={fm[2].trim()}
                            keyPrefix={`olf${bi}-${ii}-${bi2}`}
                          />
                        </div>
                      );
                    }
                    return (
                      <p key={`olp-${ii}-${bi2}`} className="chat-md-p">
                        {renderInline(bl, `olp${bi}-${ii}-${bi2}`)}
                      </p>
                    );
                  })}
                </div>
              ) : null}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (isBlockStart(next)) break;
      para.push(next);
      i += 1;
    }
    const text = para.join(" ");
    const isChannels = /^Evidence channels:/i.test(text);
    const isLead = !leadUsed && blocks.length === 0 && !sectionKids && text.length < 220;
    if (isLead) leadUsed = true;
    if (isChannels) {
      const rest = text.replace(/^Evidence channels:\s*/i, "");
      const chips = rest
        .split(/\s*·\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      push(
        <div key={`ch-${bi++}`} className="chat-md-channels">
          <span className="chat-md-channels-label">Evidence channels</span>
          <div className="chat-md-channels-row">
            {chips.map((c) => (
              <span key={c} className="chat-md-chip">
                {c}
              </span>
            ))}
          </div>
        </div>,
      );
    } else {
      push(
        <p key={`p-${bi++}`} className={cn("chat-md-p", isLead && "chat-md-lead")}>
          {renderInline(text, `p${bi}`)}
        </p>,
      );
    }
  }

  flushSection();

  return (
    <div className={cn("chat-md", className)}>
      {sources ? (
        <div className="chat-md-sources" aria-label="Sources">
          <span className="chat-md-sources-label">Grounded</span>
          <span className="chat-md-sources-text">{sources}</span>
        </div>
      ) : null}
      {blocks}
    </div>
  );
}
