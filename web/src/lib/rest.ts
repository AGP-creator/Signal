type RestError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function getUrl() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL");
  return url.replace(/\/$/, "");
}

/** Prefer publishable for PostgREST reads — sb_secret_ keys can 401 / PGRST303 as Bearer. */
function candidateKeys(): string[] {
  const keys = [
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter((k): k is string => Boolean(k && k.trim()));
  return [...new Set(keys)];
}

function isAuthSkewError(err: RestError, status: number) {
  if (status === 401 || status === 403) return true;
  if (err.code === "PGRST303") return true;
  const msg = (err.message || "").toLowerCase();
  return msg.includes("jwt") || msg.includes("unauthorized") || msg.includes("issued at future");
}

/**
 * Direct PostgREST fetch — avoids supabase-js JWT minting issues.
 * Tries publishable key first, then secret, with short retries on clock/auth skew.
 */
export async function restSelect<T>(
  table: string,
  opts?: {
    select?: string;
    order?: string;
    limit?: number;
    eq?: Record<string, string>;
    single?: boolean;
  },
): Promise<T> {
  const url = getUrl();
  const keys = candidateKeys();
  if (!keys.length) throw new Error("Missing Supabase env vars");

  const params = new URLSearchParams();
  params.set("select", opts?.select || "*");
  if (opts?.order) params.set("order", opts.order);
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.eq) {
    for (const [k, v] of Object.entries(opts.eq)) {
      params.set(k, `eq.${v}`);
    }
  }

  let lastErr: RestError | Error | null = null;

  for (const key of keys) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const headers: Record<string, string> = {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      };
      if (opts?.single) {
        headers.Accept = "application/vnd.postgresql.object+json";
        headers.Prefer = "return=representation";
      }

      const res = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
        headers,
        cache: "no-store",
      });

      if (res.ok) {
        if (res.status === 406 || res.headers.get("content-length") === "0") {
          return null as T;
        }
        const text = await res.text();
        if (!text) return (opts?.single ? null : []) as T;
        return JSON.parse(text) as T;
      }

      let err: RestError;
      try {
        err = (await res.json()) as RestError;
      } catch {
        err = { message: await res.text(), code: String(res.status) };
      }
      lastErr = err;

      if (isAuthSkewError(err, res.status)) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        // After retries on this key, try next key
        if (attempt === 2) break;
        continue;
      }
      // Non-auth error: don't bother other keys
      const msg = `${err.code || res.status}: ${err.message || "request failed"}`;
      throw new Error(msg);
    }
  }

  const msg =
    lastErr && typeof lastErr === "object" && "message" in lastErr
      ? `${(lastErr as RestError).code || "error"}: ${(lastErr as RestError).message}`
      : String(lastErr);
  throw new Error(msg);
}

/** PostgREST upsert / patch / insert — tries keys like restSelect. */
export async function restMutate<T = unknown>(
  table: string,
  opts: {
    method?: "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    eq?: Record<string, string>;
    upsert?: boolean;
    onConflict?: string;
    prefer?: string;
  },
): Promise<T> {
  const url = getUrl();
  const keys = candidateKeys();
  if (!keys.length) throw new Error("Missing Supabase env vars");

  const params = new URLSearchParams();
  if (opts.eq) {
    for (const [k, v] of Object.entries(opts.eq)) {
      params.set(k, `eq.${v}`);
    }
  }
  if (opts.onConflict) params.set("on_conflict", opts.onConflict);

  const method = opts.method || "POST";
  let lastErr: RestError | Error | null = null;

  for (const key of keys) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const headers: Record<string, string> = {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: opts.prefer || (opts.upsert ? "resolution=merge-duplicates,return=representation" : "return=representation"),
      };

      const res = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        cache: "no-store",
      });

      if (res.ok) {
        const text = await res.text();
        if (!text) return null as T;
        return JSON.parse(text) as T;
      }

      let err: RestError;
      try {
        err = (await res.json()) as RestError;
      } catch {
        err = { message: await res.text(), code: String(res.status) };
      }
      lastErr = err;

      if (isAuthSkewError(err, res.status)) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        if (attempt === 2) break;
        continue;
      }
      const msg = `${err.code || res.status}: ${err.message || "request failed"}`;
      throw new Error(msg);
    }
  }

  const msg =
    lastErr && typeof lastErr === "object" && "message" in lastErr
      ? `${(lastErr as RestError).code || "error"}: ${(lastErr as RestError).message}`
      : String(lastErr);
  throw new Error(msg);
}
