/**
 * Shared scatter / bubble-map layout for Atlas market maps, Sector Scanner
 * constellations, and any other 2D score plots.
 *
 * Fixes the common failure mode where absolute 0–100 metrics land in a tight
 * band (similar thesis scores / relevance) and all nodes visually stack.
 */

export const MAP_VIEWBOX = { w: 160, h: 110 } as const;

export type ScatterInput = {
  id: string;
  /** Higher → further right */
  xMetric: number;
  /** Higher → further up (toward top of chart) */
  yMetric: number;
  /** Desired radius in viewBox units */
  r?: number;
};

export type ScatterPoint = {
  id: string;
  x: number;
  y: number;
  r: number;
};

export type ClusterAnchor = {
  id: string;
  label: string;
  memberIds: string[];
  count: number;
};

export type ClusterLayout = ClusterAnchor & {
  cx: number;
  cy: number;
  r: number;
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function extent(values: number[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  // Guarantee usable spread even when cohort metrics are nearly identical
  if (max - min < 8) {
    const mid = (min + max) / 2;
    return { min: mid - 12, max: mid + 12 };
  }
  return { min, max };
}

function norm(v: number, min: number, max: number) {
  if (max <= min) return 0.5;
  return clamp((v - min) / (max - min), 0, 1);
}

/**
 * Place points across the full viewBox using metric normalization +
 * deterministic jitter + pairwise collision resolution.
 */
export function layoutScatter(
  inputs: ScatterInput[],
  opts?: {
    width?: number;
    height?: number;
    pad?: number;
    gap?: number;
    iterations?: number;
  },
): ScatterPoint[] {
  const w = opts?.width ?? MAP_VIEWBOX.w;
  const h = opts?.height ?? MAP_VIEWBOX.h;
  const pad = opts?.pad ?? 10;
  const gap = opts?.gap ?? 1.4;
  const iterations = opts?.iterations ?? 48;

  if (!inputs.length) return [];

  const xExt = extent(inputs.map((p) => p.xMetric));
  const yExt = extent(inputs.map((p) => p.yMetric));

  const points: ScatterPoint[] = inputs.map((p, i) => {
    const nx = norm(p.xMetric, xExt.min, xExt.max);
    const ny = norm(p.yMetric, yExt.min, yExt.max);
    // Deterministic micro-jitter so ties don't land on the exact same pixel
    const jx = ((hash(p.id) % 11) - 5) * 0.55;
    const jy = ((hash(`${p.id}:y`) % 11) - 5) * 0.45;
    // Slight spiral offset by index when many points share a band
    const spiral = ((i % 7) - 3) * 0.35;
    const r = clamp(p.r ?? 3.2, 2.2, 6.5);
    return {
      id: p.id,
      x: clamp(pad + nx * (w - pad * 2) + jx + spiral, pad, w - pad),
      y: clamp(pad + (1 - ny) * (h - pad * 2) + jy - spiral * 0.4, pad, h - pad),
      r,
    };
  });

  // Push overlapping bubbles apart (simple, deterministic)
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const minDist = a.r + b.r + gap;
        if (dist < 0.01) {
          const ang = ((hash(a.id + b.id) % 360) * Math.PI) / 180;
          dx = Math.cos(ang);
          dy = Math.sin(ang);
          dist = 0.01;
        }
        if (dist >= minDist) continue;
        const push = ((minDist - dist) / dist) * 0.5;
        const ox = dx * push;
        const oy = dy * push;
        a.x = clamp(a.x - ox, pad, w - pad);
        a.y = clamp(a.y - oy, pad, h - pad);
        b.x = clamp(b.x + ox, pad, w - pad);
        b.y = clamp(b.y + oy, pad, h - pad);
        moved = true;
      }
    }
    if (!moved) break;
  }

  return points;
}

/** Build a lookup from layoutScatter results. */
export function scatterIndex(points: ScatterPoint[]): Map<string, ScatterPoint> {
  return new Map(points.map((p) => [p.id, p]));
}

/**
 * Cluster halos from member centroids, then separate overlapping rings
 * so subsector labels don't stack on top of each other.
 */
export function layoutClusters(
  clusters: ClusterAnchor[],
  nodes: ScatterPoint[],
  opts?: { width?: number; height?: number; pad?: number },
): ClusterLayout[] {
  const w = opts?.width ?? MAP_VIEWBOX.w;
  const h = opts?.height ?? MAP_VIEWBOX.h;
  const pad = opts?.pad ?? 12;
  const byId = scatterIndex(nodes);

  const laid: ClusterLayout[] = clusters.map((cl, i) => {
    const members = cl.memberIds.map((id) => byId.get(id)).filter(Boolean) as ScatterPoint[];
    let cx: number;
    let cy: number;
    if (members.length) {
      cx = members.reduce((s, m) => s + m.x, 0) / members.length;
      cy = members.reduce((s, m) => s + m.y, 0) / members.length;
    } else {
      // Fan empty clusters around the canvas instead of dumping at center
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, clusters.length);
      cx = w / 2 + Math.cos(ang) * (w * 0.28);
      cy = h / 2 + Math.sin(ang) * (h * 0.28);
    }
    const spread = members.length
      ? Math.max(...members.map((m) => Math.hypot(m.x - cx, m.y - cy)), 0)
      : 0;
    const r = clamp(Math.max(spread + 3.5, 6 + cl.count * 0.9), 7, 16);
    return { ...cl, cx: clamp(cx, pad, w - pad), cy: clamp(cy, pad, h - pad), r };
  });

  // Separate overlapping cluster centers so labels stay readable
  for (let iter = 0; iter < 36; iter++) {
    let moved = false;
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const a = laid[i];
        const b = laid[j];
        let dx = b.cx - a.cx;
        let dy = b.cy - a.cy;
        let dist = Math.hypot(dx, dy);
        const minDist = Math.min(a.r, b.r) * 0.35 + 14;
        if (dist < 0.01) {
          const ang = ((hash(a.id + b.id) % 360) * Math.PI) / 180;
          dx = Math.cos(ang);
          dy = Math.sin(ang);
          dist = 0.01;
        }
        if (dist >= minDist) continue;
        const push = ((minDist - dist) / dist) * 0.45;
        a.cx = clamp(a.cx - dx * push, pad, w - pad);
        a.cy = clamp(a.cy - dy * push, pad, h - pad);
        b.cx = clamp(b.cx + dx * push, pad, w - pad);
        b.cy = clamp(b.cy + dy * push, pad, h - pad);
        moved = true;
      }
    }
    if (!moved) break;
  }

  return laid;
}
