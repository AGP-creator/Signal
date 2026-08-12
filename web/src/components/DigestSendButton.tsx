"use client";

import { useEffect, useState } from "react";

type MailStatus = {
  ok?: boolean;
  recipients?: string[];
  smtp_host?: string | null;
  smtp_port?: number;
  smtp_user?: string | null;
  smtp_from?: string | null;
  smtp_password_set?: boolean;
  smtp_configured?: boolean;
};

type SampleResult = MailStatus & {
  error?: string;
  hint?: string;
  sent_count?: number;
  samples?: Array<{
    day: string;
    subject: string;
    deals: number;
    email?: { sent?: boolean; preview_only?: boolean; reason?: string; to?: string[] };
  }>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LS_KEY = "signal-digest-recipients";

function parseDraft(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && EMAIL_RE.test(s));
}

export function DigestSendButton() {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [smtpOpen, setSmtpOpen] = useState(false);
  const [status, setStatus] = useState<MailStatus | null>(null);

  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/digest/send");
        const data = (await res.json()) as MailStatus;
        if (cancelled) return;
        setStatus(data);
        if (data.recipients?.length) setEmails(data.recipients);
        else {
          try {
            const local = JSON.parse(localStorage.getItem(LS_KEY) || "[]") as string[];
            if (Array.isArray(local) && local.length) setEmails(local.filter((e) => EMAIL_RE.test(e)));
          } catch {
            /* ignore */
          }
        }
        if (data.smtp_host) setSmtpHost(data.smtp_host);
        if (data.smtp_port) setSmtpPort(String(data.smtp_port));
        if (data.smtp_user) setSmtpUser(data.smtp_user);
        if (data.smtp_from) setSmtpFrom(data.smtp_from);
        if (!data.smtp_configured) setSmtpOpen(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(emails));
    } catch {
      /* ignore */
    }
  }, [emails]);

  function addFromDraft() {
    const next = parseDraft(draft);
    if (!next.length) {
      setErr("Enter a valid email (e.g. partner@firm.com)");
      return;
    }
    setEmails((prev) => {
      const merged = [...prev];
      for (const e of next) if (!merged.includes(e)) merged.push(e);
      return merged;
    });
    setDraft("");
    setErr(null);
  }

  function removeEmail(addr: string) {
    setEmails((prev) => prev.filter((e) => e !== addr));
  }

  async function saveOnly() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/digest/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emails,
          save: true,
          send: false,
          smtp: smtpPayload(),
        }),
      });
      const data = (await res.json()) as SampleResult;
      if (!res.ok || !data.ok) {
        setErr(data.error || "Could not save mail settings");
        return;
      }
      setStatus(data);
      if (data.recipients?.length) setEmails(data.recipients);
      setMsg(
        data.smtp_configured
          ? `Saved ${data.recipients?.length ?? 0} recipient(s). SMTP ready — you can send live mail.`
          : `Saved ${data.recipients?.length ?? 0} recipient(s). Add SMTP below to send live mail.`,
      );
      setSmtpPass("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function smtpPayload() {
    const port = Number(smtpPort) || 587;
    return {
      host: smtpHost.trim(),
      port,
      user: smtpUser.trim(),
      from: smtpFrom.trim() || smtpUser.trim(),
      ...(smtpPass.trim() ? { password: smtpPass.trim() } : {}),
    };
  }

  async function sendSamples() {
    setBusy(true);
    setMsg(null);
    setErr(null);

    let list = emails;
    const pending = parseDraft(draft);
    if (pending.length) {
      list = [...emails];
      for (const e of pending) if (!list.includes(e)) list.push(e);
      setEmails(list);
      setDraft("");
    }

    if (!list.length) {
      setErr("Add at least one partner email first.");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/digest/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: list,
          preview_only: false,
          save: true,
          send: true,
          smtp: smtpPayload(),
        }),
      });
      const data = (await res.json()) as SampleResult;
      if (!res.ok || !data.ok) {
        setErr(data.error || data.hint || "Sample digests failed");
        return;
      }
      setStatus(data);
      const n = data.samples?.length ?? 0;
      const sent = data.sent_count ?? data.samples?.filter((s) => s.email?.sent).length ?? 0;
      const days = (data.samples || []).map((s) => s.day).join(", ");
      const who = (data.recipients || list).join(", ");
      if (sent > 0) {
        setMsg(`Sent ${sent}/${n} sample digests (${days}) to ${who}.`);
      } else if (data.smtp_configured) {
        setMsg(`${n} samples generated for ${who}, but SMTP send did not complete. ${data.hint || ""}`);
      } else {
        setMsg(
          `${n} sample digests ready (${days}) for ${who}. SMTP not set — wrote .eml previews. Expand SMTP below to send live mail.`,
        );
        setSmtpOpen(true);
      }
      setSmtpPass("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(status?.smtp_configured || (emails.length && status?.smtp_host && status?.smtp_password_set));

  return (
    <div className="mb-5 mt-4 space-y-3">
      <div>
        <div className="label-caps">Partner emails</div>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--faint)]">
          Who receives the M/W/F digest. Add your addresses, then send.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {emails.map((addr) => (
            <span
              key={addr}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 text-[0.75rem] text-[var(--text)]"
            >
              {addr}
              <button
                type="button"
                onClick={() => removeEmail(addr)}
                className="text-[var(--faint)] hover:text-[var(--warn)]"
                aria-label={`Remove ${addr}`}
              >
                ×
              </button>
            </span>
          ))}
          {!emails.length ? (
            <span className="text-[0.75rem] text-[var(--faint)]">No recipients yet</span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addFromDraft();
              }
            }}
            placeholder="partner@firm.com"
            className="field min-w-0 flex-1"
            autoComplete="email"
          />
          <button
            type="button"
            onClick={addFromDraft}
            className="btn btn-soft btn-sm shrink-0"
            disabled={busy}
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-md border border-[var(--line)] bg-[var(--panel-2)]/40 px-3 py-2.5">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left text-[0.8125rem] font-medium text-[var(--text)]"
          onClick={() => setSmtpOpen((o) => !o)}
        >
          <span>SMTP · {ready || status?.smtp_configured ? "ready for live send" : "needed for live mail"}</span>
          <span className="text-[var(--faint)]">{smtpOpen ? "Hide" : "Show"}</span>
        </button>
        {smtpOpen ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="block text-[0.7rem] text-[var(--faint)]">
              Host
              <input
                className="field mt-1 w-full"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </label>
            <label className="block text-[0.7rem] text-[var(--faint)]">
              Port
              <input
                className="field mt-1 w-full"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
              />
            </label>
            <label className="block text-[0.7rem] text-[var(--faint)]">
              Username
              <input
                className="field mt-1 w-full"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="you@gmail.com"
                autoComplete="username"
              />
            </label>
            <label className="block text-[0.7rem] text-[var(--faint)]">
              Password / app password
              <input
                type="password"
                className="field mt-1 w-full"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder={status?.smtp_password_set ? "•••••••• (saved)" : "App password"}
                autoComplete="current-password"
              />
            </label>
            <label className="block text-[0.7rem] text-[var(--faint)] sm:col-span-2">
              From address
              <input
                className="field mt-1 w-full"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                placeholder="signal@thirdbase.example"
              />
            </label>
            <p className="sm:col-span-2 text-[0.7rem] leading-relaxed text-[var(--faint)]">
              For Gmail, use an App Password (not your normal login). Settings are stored locally in{" "}
              <span className="mono">data/config/mail.json</span> (gitignored) — not committed.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={sendSamples}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-3.5 py-2 text-[0.8125rem] font-semibold text-[var(--text)] transition hover:border-[var(--signal)]/40 hover:text-[var(--signal)] disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send sample M/W/F emails"}
        </button>
        <button
          type="button"
          onClick={saveOnly}
          disabled={busy || (!emails.length && !smtpHost.trim())}
          className="btn btn-ghost btn-sm"
        >
          Save recipients
        </button>
      </div>
      {msg ? <p className="text-[0.8125rem] text-[var(--muted)]">{msg}</p> : null}
      {err ? <p className="text-[0.8125rem] text-[var(--warn)]">{err}</p> : null}
    </div>
  );
}
