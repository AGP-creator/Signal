"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Point = { label: string; value: number };

function extent(values: number[], pad = 0.08) {
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  return { min: min - span * pad, max: max + span * pad, span };
}

export function AreaChart({
  series,
  height = 180,
  className,
  color = "var(--signal)",
  formatValue = (v) => String(Math.round(v)),
}: {
  series: Point[];
  height?: number;
  className?: string;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const gid = useId().replace(/:/g, "");
  if (!series.length) return null;
  const w = 400;
  const h = height;
  const pad = { t: 16, r: 12, b: 28, l: 40 };
  const { max, span } = extent(series.map((p) => p.value));
  const xs = series.map((_, i) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(series.length - 1, 1));
  const ys = series.map((p) => pad.t + ((max - p.value) / span) * (h - pad.t - pad.b));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length - 1].toFixed(1)},${(h - pad.b).toFixed(1)} L${xs[0].toFixed(1)},${(h - pad.b).toFixed(1)} Z`;

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        <defs>
          <linearGradient id={`areaFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => {
          const y = pad.t + t * (h - pad.t - pad.b);
          const val = max - t * span;
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" className="fill-[var(--faint)]" fontSize="9" fontFamily="var(--font-mono)">
                {formatValue(val)}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#areaFill-${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinejoin="round" />
        {xs.map((x, i) => (
          <g key={series[i].label}>
            <circle cx={x} cy={ys[i]} r="3.5" fill="var(--panel)" stroke={color} strokeWidth="2" />
            <text x={x} y={h - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize="9">
              {series[i].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function DualLineChart({
  a,
  b,
  aLabel,
  bLabel,
  height = 180,
  className,
  formatA = (v) => String(Math.round(v)),
  formatB = (v) => String(Math.round(v)),
}: {
  a: Point[];
  b: Point[];
  aLabel: string;
  bLabel: string;
  height?: number;
  className?: string;
  formatA?: (v: number) => string;
  formatB?: (v: number) => string;
}) {
  if (!a.length) return null;
  const w = 400;
  const h = height;
  const pad = { t: 16, r: 12, b: 36, l: 40 };
  const labels = a.map((p) => p.label);
  const extA = extent(a.map((p) => p.value));
  const extB = extent(b.map((p) => p.value));
  const xs = labels.map((_, i) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(labels.length - 1, 1));
  const ya = a.map((p) => pad.t + ((extA.max - p.value) / extA.span) * (h - pad.t - pad.b));
  const yb = b.map((p) => pad.t + ((extB.max - p.value) / extB.span) * (h - pad.t - pad.b));
  const line = (xsArr: number[], ysArr: number[]) =>
    xsArr.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ysArr[i].toFixed(1)}`).join(" ");

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex flex-wrap gap-4 text-[0.75rem] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--signal)]" />
          {aLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--warn)]" />
          {bLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        <path d={line(xs, ya)} fill="none" stroke="var(--signal)" strokeWidth="2.25" strokeLinejoin="round" />
        <path d={line(xs, yb)} fill="none" stroke="var(--warn)" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" />
        {xs.map((x, i) => (
          <text key={labels[i]} x={x} y={h - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize="9">
            {labels[i]}
          </text>
        ))}
        <text x={pad.l} y={12} className="fill-[var(--faint)]" fontSize="9" fontFamily="var(--font-mono)">
          {formatA(extA.max)}
        </text>
        <text x={w - pad.r} y={12} textAnchor="end" className="fill-[var(--faint)]" fontSize="9" fontFamily="var(--font-mono)">
          {formatB(extB.max)}
        </text>
      </svg>
    </div>
  );
}

export function BarChart({
  series,
  height = 160,
  className,
  color = "var(--signal)",
  formatValue = (v) => `${Math.round(v)}`,
}: {
  series: Point[];
  height?: number;
  className?: string;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  if (!series.length) return null;
  const w = 400;
  const h = height;
  const pad = { t: 20, r: 8, b: 28, l: 8 };
  const max = Math.max(...series.map((p) => p.value), 1);
  const gap = 8;
  const barW = (w - pad.l - pad.r - gap * (series.length - 1)) / series.length;

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        {series.map((p, i) => {
          const bh = ((p.value / max) * (h - pad.t - pad.b)) || 2;
          const x = pad.l + i * (barW + gap);
          const y = h - pad.b - bh;
          return (
            <g key={p.label}>
              <rect x={x} y={y} width={barW} height={bh} rx="4" fill={color} opacity={0.85 - i * 0.04} />
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="fill-[var(--text)]" fontSize="9" fontFamily="var(--font-mono)">
                {formatValue(p.value)}
              </text>
              <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize="9">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DonutChart({
  slices,
  size = 160,
  className,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; pct: number; color: string }[];
  size?: number;
  className?: string;
  centerLabel?: string;
  centerValue?: string;
}) {
  const r = 56;
  const cx = 80;
  const cy = 80;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-5", className)}>
      <svg width={size} height={size} viewBox="0 0 160 160" className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--panel-2)" strokeWidth="18" />
        {slices.map((s) => {
          const len = (s.pct / 100) * circ;
          const el = (
            <circle
              key={s.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
        {centerValue ? (
          <text x={cx} y={cy - 2} textAnchor="middle" className="fill-[var(--text)]" fontSize="16" fontFamily="var(--font-mono)" fontWeight="600">
            {centerValue}
          </text>
        ) : null}
        {centerLabel ? (
          <text x={cx} y={cy + 14} textAnchor="middle" className="fill-[var(--muted)]" fontSize="9">
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <div className="min-w-[10rem] space-y-2">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 text-[0.8125rem]">
            <span className="inline-flex items-center gap-2 text-[var(--muted)]">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="mono text-[var(--text)]">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RadarChart({
  scores,
  size = 220,
  className,
}: {
  scores: Record<string, number>;
  size?: number;
  className?: string;
}) {
  const entries = Object.entries(scores);
  if (entries.length < 3) return null;
  const n = entries.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, v: number) => {
    const a = angle(i);
    const rr = (Math.max(0, Math.min(100, v)) / 100) * r;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)] as const;
  };
  const poly = entries.map(([, v], i) => pt(i, v).join(",")).join(" ");
  const rings = [25, 50, 75, 100];

  return (
    <div className={cn("flex justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((rv) => (
          <polygon
            key={rv}
            points={entries.map((_, i) => pt(i, rv).join(",")).join(" ")}
            fill="none"
            stroke="var(--line)"
            strokeWidth="1"
          />
        ))}
        {entries.map(([label], i) => {
          const [x, y] = pt(i, 100);
          const [lx, ly] = pt(i, 118);
          return (
            <g key={label}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-[var(--muted)]" fontSize="10">
                {label}
              </text>
            </g>
          );
        })}
        <polygon points={poly} fill="var(--signal-dim)" stroke="var(--signal)" strokeWidth="2" />
        {entries.map(([, v], i) => {
          const [x, y] = pt(i, v);
          return <circle key={i} cx={x} cy={y} r="3" fill="var(--panel)" stroke="var(--signal)" strokeWidth="2" />;
        })}
      </svg>
    </div>
  );
}

export function SparkBars({
  values,
  className,
  color = "var(--signal)",
}: {
  values: number[];
  className?: string;
  color?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={cn("flex h-8 items-end gap-0.5", className)}>
      {values.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm opacity-80"
          style={{ height: `${Math.max(12, (v / max) * 100)}%`, background: color }}
        />
      ))}
    </div>
  );
}

/** Signed growth bars — green up / red down for YoY / QoQ. */
export function GrowthBarChart({
  series,
  height = 170,
  className,
  formatValue = (v) => `${v >= 0 ? "+" : ""}${Math.round(v)}%`,
}: {
  series: Point[];
  height?: number;
  className?: string;
  formatValue?: (v: number) => string;
}) {
  if (!series.length) return null;
  const w = 400;
  const h = height;
  const pad = { t: 22, r: 8, b: 28, l: 8 };
  const maxAbs = Math.max(...series.map((p) => Math.abs(p.value)), 1);
  const gap = 8;
  const barW = (w - pad.l - pad.r - gap * (series.length - 1)) / series.length;
  const midY = pad.t + (h - pad.t - pad.b) / 2;
  const half = (h - pad.t - pad.b) / 2;

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        <line x1={pad.l} x2={w - pad.r} y1={midY} y2={midY} stroke="var(--line)" strokeWidth="1" />
        {series.map((p, i) => {
          const bh = (Math.abs(p.value) / maxAbs) * half;
          const x = pad.l + i * (barW + gap);
          const up = p.value >= 0;
          const y = up ? midY - bh : midY;
          const fill = up ? "var(--ok)" : "var(--danger)";
          return (
            <g key={p.label}>
              <rect x={x} y={y} width={barW} height={Math.max(bh, 2)} rx="3" fill={fill} opacity={0.88} />
              <text
                x={x + barW / 2}
                y={up ? y - 6 : y + bh + 12}
                textAnchor="middle"
                className="fill-[var(--text)]"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                {formatValue(p.value)}
              </text>
              <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize="9">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type WaterfallStep = {
  label: string;
  value: number;
  kind?: "total" | "delta" | "subtotal";
  color?: string;
};

/** Classic ARR / valuation waterfall. */
export function WaterfallChart({
  steps,
  height = 200,
  className,
  formatValue = (v) => `$${Math.abs(v).toFixed(1)}M`,
}: {
  steps: WaterfallStep[];
  height?: number;
  className?: string;
  formatValue?: (v: number) => string;
}) {
  if (!steps.length) return null;
  const w = 440;
  const h = height;
  const pad = { t: 24, r: 10, b: 32, l: 10 };
  let running = 0;
  const bars = steps.map((s) => {
    const kind = s.kind ?? (s.value >= 0 ? "delta" : "delta");
    if (kind === "total" || kind === "subtotal") {
      const from = 0;
      const to = s.value;
      running = s.value;
      return { ...s, kind, from, to };
    }
    const from = running;
    const to = running + s.value;
    running = to;
    return { ...s, kind, from, to };
  });
  const vals = bars.flatMap((b) => [b.from, b.to]);
  const min = Math.min(0, ...vals);
  const max = Math.max(...vals, 1);
  const span = max - min || 1;
  const gap = 6;
  const barW = (w - pad.l - pad.r - gap * (bars.length - 1)) / bars.length;
  const yOf = (v: number) => pad.t + ((max - v) / span) * (h - pad.t - pad.b);

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        {[0, 0.5, 1].map((t) => {
          const y = pad.t + t * (h - pad.t - pad.b);
          return <line key={t} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />;
        })}
        {bars.map((b, i) => {
          const x = pad.l + i * (barW + gap);
          const top = Math.max(b.from, b.to);
          const bot = Math.min(b.from, b.to);
          const y = yOf(top);
          const bh = Math.max(2, yOf(bot) - y);
          const isTotal = b.kind === "total" || b.kind === "subtotal";
          const fill =
            b.color ||
            (isTotal ? "var(--signal)" : b.value >= 0 ? "var(--ok)" : "var(--danger)");
          const connector =
            i < bars.length - 1 ? (
              <line
                x1={x + barW}
                x2={pad.l + (i + 1) * (barW + gap)}
                y1={yOf(b.to)}
                y2={yOf(b.to)}
                stroke="var(--faint)"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
            ) : null;
          return (
            <g key={`${b.label}-${i}`}>
              {connector}
              <rect x={x} y={y} width={barW} height={bh} rx="3" fill={fill} opacity={isTotal ? 0.95 : 0.85} />
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-[var(--text)]"
                fontSize="8.5"
                fontFamily="var(--font-mono)"
              >
                {formatValue(isTotal ? b.to : b.value)}
              </text>
              <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize="8.5">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Full-width stacked ownership strip (cap table). */
export function StackedOwnership({
  slices,
  className,
  height = 28,
}: {
  slices: { label: string; pct: number; color: string }[];
  className?: string;
  height?: number;
}) {
  const total = slices.reduce((s, x) => s + x.pct, 0) || 1;
  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex w-full overflow-hidden rounded-md border border-[var(--line)]"
        style={{ height }}
        role="img"
        aria-label="Ownership stack"
      >
        {slices.map((s) => (
          <div
            key={s.label}
            title={`${s.label}: ${s.pct}%`}
            style={{
              width: `${(s.pct / total) * 100}%`,
              background: s.color,
              minWidth: s.pct > 0 ? 2 : 0,
            }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {slices.map((s) => (
          <div key={s.label} className="inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--muted)]">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="mono text-[var(--text)]">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Semi-circle / arc gauge for runway, Rule of 40, etc. */
export function GaugeChart({
  value,
  max = 100,
  label,
  sub,
  color = "var(--signal)",
  format = (v) => String(Math.round(v)),
  className,
  size = 152,
}: {
  value: number;
  max?: number;
  label: string;
  sub?: string;
  color?: string;
  format?: (v: number) => string;
  className?: string;
  size?: number;
}) {
  const gid = useId().replace(/:/g, "");
  const r = 54;
  const cx = 70;
  const cy = 70;
  const circ = Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = pct * circ;
  const endColor = color.includes("ok") || color === "var(--ok)" ? "var(--ok)" : color;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={size} height={size * 0.72} viewBox="0 0 140 102" className="overflow-visible">
        <defs>
          <linearGradient id={`gauge-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.85" />
            <stop offset="55%" stopColor={color} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
          <filter id={`glow-${gid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--panel-2)"
          strokeWidth="11"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={`url(#gauge-${gid})`}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          filter={`url(#glow-${gid})`}
        />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="fill-[var(--text)]"
          fontSize="23"
          fontFamily="var(--font-mono)"
          fontWeight="600"
        >
          {format(value)}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-[var(--muted)]" fontSize="10">
          {label}
        </text>
      </svg>
      {sub ? (
        <div className="mt-[-0.15rem] max-w-[12rem] text-center text-[0.75rem] leading-snug text-[var(--faint)]">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

/** Step / ladder chart for post-money valuation by round. */
export function ValuationStepChart({
  series,
  height = 180,
  className,
  formatValue = (v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}B` : `${Math.round(v)}M`}`,
}: {
  series: Point[];
  height?: number;
  className?: string;
  formatValue?: (v: number) => string;
}) {
  const gid = useId().replace(/:/g, "");
  if (!series.length) return null;
  const w = 400;
  const h = height;
  const pad = { t: 28, r: 16, b: 28, l: 44 };
  const { max, span } = extent(series.map((p) => p.value), 0.08);
  const xs = series.map((_, i) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(series.length - 1, 1));
  const ys = series.map((p) => pad.t + ((max - p.value) / span) * (h - pad.t - pad.b));
  let d = "";
  xs.forEach((x, i) => {
    if (i === 0) d += `M${x},${ys[i]}`;
    else {
      d += ` L${x},${ys[i - 1]} L${x},${ys[i]}`;
    }
  });
  const baseY = h - pad.b;
  const area =
    series.length === 1
      ? `M${xs[0]},${ys[0]} L${xs[0]},${baseY} Z`
      : `${d} L${xs[xs.length - 1]},${baseY} L${xs[0]},${baseY} Z`;

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        <defs>
          <linearGradient id={`stepFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--signal)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => {
          const y = pad.t + t * (h - pad.t - pad.b);
          const val = max - t * span;
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" className="fill-[var(--faint)]" fontSize="9" fontFamily="var(--font-mono)">
                {formatValue(val)}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#stepFill-${gid})`} />
        <path d={d} fill="none" stroke="var(--signal)" strokeWidth="2.75" strokeLinejoin="round" />
        {xs.map((x, i) => (
          <g key={series[i].label}>
            <circle cx={x} cy={ys[i]} r="5" fill="var(--panel)" stroke="var(--signal)" strokeWidth="2.25" />
            <circle cx={x} cy={ys[i]} r="2" fill="var(--signal)" />
            <text x={x} y={ys[i] - 12} textAnchor="middle" className="fill-[var(--text)]" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">
              {formatValue(series[i].value)}
            </text>
            <text x={x} y={h - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize="9">
              {series[i].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const COMPARE_PALETTE = [
  "var(--signal)",
  "var(--ok)",
  "var(--warn)",
  "var(--deep)",
];

/** Side-by-side grouped bars — deal compare dimensions. */
export function GroupedBarChart({
  groups,
  seriesKeys,
  seriesLabels,
  height = 220,
  className,
  colors = COMPARE_PALETTE,
}: {
  groups: { label: string; values: Record<string, number | null> }[];
  seriesKeys: string[];
  seriesLabels?: Record<string, string>;
  height?: number;
  className?: string;
  colors?: string[];
}) {
  if (!groups.length || !seriesKeys.length) return null;
  const w = 520;
  const h = height;
  const pad = { t: 18, r: 8, b: 42, l: 8 };
  const max = Math.max(
    100,
    ...groups.flatMap((g) => seriesKeys.map((k) => g.values[k] ?? 0)),
  );
  const clusterGap = 10;
  const clusterW = (w - pad.l - pad.r - clusterGap * (groups.length - 1)) / groups.length;
  const barGap = 2;
  const barW = Math.max(4, (clusterW - barGap * (seriesKeys.length - 1)) / seriesKeys.length);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex flex-wrap gap-3 text-[0.75rem] text-[var(--muted)]">
        {seriesKeys.map((k, i) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: colors[i % colors.length] }}
            />
            {seriesLabels?.[k] || k}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        {[0, 0.5, 1].map((t) => {
          const y = pad.t + t * (h - pad.t - pad.b);
          return (
            <line key={t} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
          );
        })}
        {groups.map((g, gi) => {
          const cx = pad.l + gi * (clusterW + clusterGap);
          return (
            <g key={g.label}>
              {seriesKeys.map((k, si) => {
                const v = g.values[k] ?? 0;
                const bh = Math.max(2, (v / max) * (h - pad.t - pad.b));
                const x = cx + si * (barW + barGap);
                const y = h - pad.b - bh;
                return (
                  <rect
                    key={k}
                    x={x}
                    y={y}
                    width={barW}
                    height={bh}
                    rx="3"
                    fill={colors[si % colors.length]}
                    opacity={0.88}
                  />
                );
              })}
              <text
                x={cx + clusterW / 2}
                y={h - 10}
                textAnchor="middle"
                className="fill-[var(--muted)]"
                fontSize="8.5"
              >
                {g.label.length > 10 ? `${g.label.slice(0, 9)}…` : g.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Trapezoid funnel for pipeline / LP selectivity. */
export function FunnelChart({
  steps,
  className,
  height = 200,
}: {
  steps: { label: string; count: number; pct?: number }[];
  className?: string;
  height?: number;
}) {
  if (!steps.length) return null;
  const w = 420;
  const h = height;
  const pad = { t: 8, r: 110, b: 8, l: 8 };
  const max = Math.max(...steps.map((s) => s.count), 1);
  const rowH = (h - pad.t - pad.b) / steps.length;
  const colors = ["var(--signal)", "var(--deep)", "var(--ok)", "var(--warn)", "var(--faint)"];

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        {steps.map((s, i) => {
          const prev = steps[Math.max(0, i - 1)].count;
          const topW = Math.max(56, (prev / max) * (w - pad.l - pad.r));
          const botW = Math.max(48, (s.count / max) * (w - pad.l - pad.r));
          const y0 = pad.t + i * rowH + 3;
          const y1 = pad.t + (i + 1) * rowH - 3;
          const cx = pad.l + (w - pad.l - pad.r) / 2;
          const topHalf = (i === 0 ? botW : topW) / 2;
          const botHalf = botW / 2;
          const d = `M${cx - topHalf},${y0} L${cx + topHalf},${y0} L${cx + botHalf},${y1} L${cx - botHalf},${y1} Z`;
          return (
            <g key={s.label}>
              <path d={d} fill={colors[i % colors.length]} opacity={0.82 - i * 0.07} />
              <text
                x={cx}
                y={(y0 + y1) / 2 + 4}
                textAnchor="middle"
                className="fill-white"
                fontSize="11"
                fontFamily="var(--font-mono)"
                fontWeight="600"
              >
                {s.count}
              </text>
              <text
                x={w - pad.r + 8}
                y={(y0 + y1) / 2 + 4}
                className="fill-[var(--muted)]"
                fontSize="10"
              >
                {s.label}
                {s.pct != null ? ` · ${s.pct}%` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Horizontal tension bars — left vs right evidence strength. */
export function TensionBars({
  rows,
  className,
}: {
  rows: { id: string; title: string; severity: "high" | "medium" | "low"; left: string; right: string }[];
  className?: string;
}) {
  if (!rows.length) return null;
  const sevPct = { high: 92, medium: 62, low: 34 };
  const sevColor = {
    high: "var(--danger)",
    medium: "var(--warn)",
    low: "var(--faint)",
  };

  return (
    <div className={cn("space-y-3", className)}>
      {rows.map((r) => (
        <div key={r.id}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-[0.75rem]">
            <span className="truncate text-[var(--muted)]">{r.title}</span>
            <span className="mono shrink-0" style={{ color: sevColor[r.severity] }}>
              {r.severity}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${sevPct[r.severity]}%`,
                background: `linear-gradient(90deg, ${sevColor[r.severity]}, transparent)`,
                opacity: 0.85,
              }}
            />
            <div
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[var(--panel)]"
              style={{
                left: `calc(${sevPct[r.severity]}% - 5px)`,
                background: sevColor[r.severity],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Horizontal bullet / benchmark bars for unit economics. */
export function BenchmarkBars({
  rows,
  className,
}: {
  rows: { label: string; value: number; max: number; format: string; good?: boolean }[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-3.5", className)}>
      {rows.map((r) => {
        const pct = Math.max(4, Math.min(100, (r.value / r.max) * 100));
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[0.8125rem]">
              <span className="text-[var(--muted)]">{r.label}</span>
              <span className="mono text-[var(--text)]">{r.format}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${pct}%`,
                  background: r.good === false ? "var(--warn)" : "linear-gradient(90deg, var(--deep), var(--signal))",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Simple exit proceeds stack for liquidation preference illustration. */
export function ExitWaterfallChart({
  rows,
  className,
  height = 160,
}: {
  rows: { label: string; amount_m: number; color: string }[];
  className?: string;
  height?: number;
}) {
  if (!rows.length) return null;
  const w = 400;
  const h = height;
  const pad = { t: 16, r: 12, b: 28, l: 12 };
  const max = Math.max(...rows.map((r) => r.amount_m), 1);
  const gap = 10;
  const barW = (w - pad.l - pad.r - gap * (rows.length - 1)) / rows.length;

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
        {rows.map((r, i) => {
          const bh = (r.amount_m / max) * (h - pad.t - pad.b) || 2;
          const x = pad.l + i * (barW + gap);
          const y = h - pad.b - bh;
          return (
            <g key={r.label}>
              <rect x={x} y={y} width={barW} height={bh} rx="4" fill={r.color} opacity={0.9} />
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-[var(--text)]"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                ${r.amount_m >= 1000 ? `${(r.amount_m / 1000).toFixed(1)}B` : `${Math.round(r.amount_m)}M`}
              </text>
              <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize="9">
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Square firm×firm co-invest heat grid. Click a cell to surface the pair. */
export function HeatMatrix({
  labels,
  cells,
  max,
  className,
  onSelect,
  selected,
}: {
  labels: string[];
  cells: number[][];
  max: number;
  className?: string;
  onSelect?: (i: number, j: number, value: number) => void;
  selected?: { i: number; j: number } | null;
}) {
  const n = labels.length;
  if (!n) return null;
  const short = (s: string) => {
    if (s.length <= 10) return s;
    const parts = s.split(/\s+/);
    if (parts[0].length <= 10) return parts[0];
    return `${s.slice(0, 8)}…`;
  };
  const cell = 30;

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div
        className="mx-auto inline-grid min-w-[28rem] max-w-4xl"
        style={{
          gridTemplateColumns: `5.75rem repeat(${n}, ${cell}px)`,
          gridTemplateRows: `7.25rem repeat(${n}, ${cell}px)`,
        }}
        role="img"
        aria-label="Co-investor heatmap"
      >
        <div aria-hidden />
        {labels.map((lab, j) => (
          <div key={`c-${lab}-${j}`} className="relative overflow-visible">
            <span
              className="pointer-events-none absolute bottom-2.5 left-1/2 whitespace-nowrap text-[0.625rem] leading-none text-[var(--muted)]"
              style={{
                // End of label sits on the column; body rises up-left into the header band.
                transform: "translateX(-100%) rotate(-52deg)",
                transformOrigin: "right bottom",
              }}
              title={lab}
            >
              {short(lab)}
            </span>
          </div>
        ))}
        {labels.map((lab, i) => (
          <div key={`row-${lab}-${i}`} className="contents">
            <div
              className="flex items-center justify-end pr-2 text-right text-[0.625rem] leading-tight text-[var(--muted)]"
              title={lab}
            >
              {short(lab)}
            </div>
            {(cells[i] || []).map((v, j) => {
              const intensity = v <= 0 ? 0 : 0.12 + (v / Math.max(max, 1)) * 0.88;
              const isDiag = i === j;
              const isSel =
                selected &&
                ((selected.i === i && selected.j === j) ||
                  (selected.i === j && selected.j === i));
              const clickable = v > 0 && !isDiag && !!onSelect;
              return (
                <button
                  key={`${i}-${j}`}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (clickable) onSelect?.(i, j, v);
                  }}
                  title={
                    isDiag
                      ? lab
                      : v > 0
                        ? `${labels[i]} × ${labels[j]} · ${v}`
                        : undefined
                  }
                  className={cn(
                    "m-[1px] rounded-[3px] border text-[0.5625rem] font-semibold tabular-nums transition",
                    clickable && "cursor-pointer hover:brightness-110",
                    !clickable && "cursor-default",
                  )}
                  style={{
                    background: isDiag
                      ? "var(--panel-2)"
                      : v <= 0
                        ? "var(--panel-2)"
                        : `color-mix(in srgb, var(--signal) ${Math.round(intensity * 100)}%, var(--panel))`,
                    borderColor: isSel ? "var(--text)" : "var(--line)",
                    borderWidth: isSel ? 1.5 : 0.5,
                    color: "var(--text)",
                  }}
                >
                  {v > 0 && !isDiag ? v : ""}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
