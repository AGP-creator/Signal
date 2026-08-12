import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ROOT = path.resolve(process.cwd(), "..");
const PY = path.join(ROOT, ".venv", "Scripts", "python.exe");
const SCRIPT = path.join(ROOT, "scripts", "send_digest_samples.py");
const MAIL_CONFIG = path.join(ROOT, "data", "config", "mail.json");

type MailConfigFile = {
  digest_to?: string[];
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_from?: string;
  smtp_password?: string;
};

function normalizeEmails(raw: unknown): string[] {
  const parts: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) parts.push(...String(item).split(","));
  } else if (typeof raw === "string") {
    parts.push(...raw.split(","));
  }
  const out: string[] = [];
  for (const p of parts) {
    const addr = p.trim().toLowerCase();
    if (addr && addr.includes("@") && !out.includes(addr)) out.push(addr);
  }
  return out;
}

function isEmail(addr: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr);
}

async function readMailFile(): Promise<MailConfigFile> {
  try {
    const raw = await fs.readFile(MAIL_CONFIG, "utf8");
    const data = JSON.parse(raw) as MailConfigFile;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

async function writeMailFile(patch: Partial<MailConfigFile> & { clear_password?: boolean }) {
  const current = await readMailFile();
  const next: MailConfigFile = { ...current };

  if (patch.digest_to !== undefined) {
    next.digest_to = normalizeEmails(patch.digest_to).filter(isEmail);
  }
  if (patch.smtp_host !== undefined) {
    const v = String(patch.smtp_host || "").trim();
    if (v) next.smtp_host = v;
    else delete next.smtp_host;
  }
  if (patch.smtp_port !== undefined && patch.smtp_port !== null) {
    const n = Number(patch.smtp_port);
    if (Number.isFinite(n) && n > 0) next.smtp_port = n;
  }
  if (patch.smtp_user !== undefined) {
    const v = String(patch.smtp_user || "").trim();
    if (v) next.smtp_user = v;
    else delete next.smtp_user;
  }
  if (patch.smtp_from !== undefined) {
    const v = String(patch.smtp_from || "").trim();
    if (v) next.smtp_from = v;
    else delete next.smtp_from;
  }
  if (patch.clear_password) {
    delete next.smtp_password;
  } else if (patch.smtp_password !== undefined) {
    const v = String(patch.smtp_password || "").trim();
    if (v) next.smtp_password = v;
  }

  await fs.mkdir(path.dirname(MAIL_CONFIG), { recursive: true });
  await fs.writeFile(MAIL_CONFIG, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function publicStatus(cfg: MailConfigFile) {
  const recipients = normalizeEmails(cfg.digest_to || []);
  const host = String(cfg.smtp_host || "").trim();
  return {
    recipients,
    smtp_host: host || null,
    smtp_port: cfg.smtp_port || 587,
    smtp_user: cfg.smtp_user || null,
    smtp_from: cfg.smtp_from || null,
    smtp_password_set: Boolean(String(cfg.smtp_password || "").trim()),
    smtp_configured: Boolean(host && recipients.length),
    config_path: MAIL_CONFIG,
  };
}

function runPython(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(PY, args, {
      cwd: ROOT,
      env: process.env,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || stdout || `Exit ${code}`));
    });
  });
}

/** Status: saved recipients + whether SMTP is ready to send live mail. */
export async function GET() {
  const cfg = await readMailFile();
  const status = publicStatus(cfg);
  return NextResponse.json({
    ok: true,
    usage: "POST /api/digest/send — save recipients / SMTP and optionally send Mon/Wed/Fri samples",
    ...status,
    body: {
      to: ["partner@example.com"],
      preview_only: false,
      save: true,
      smtp: {
        host: "smtp.gmail.com",
        port: 587,
        user: "you@gmail.com",
        password: "app-password",
        from: "signal@thirdbase.example",
      },
    },
  });
}

/** Save mail settings and/or generate + send sample digests. */
export async function POST(req: Request) {
  let body: {
    to?: string[] | string;
    preview_only?: boolean;
    save?: boolean;
    send?: boolean;
    smtp?: {
      host?: string;
      port?: number;
      user?: string;
      password?: string;
      from?: string;
      clear_password?: boolean;
    };
  } = {};

  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const to = normalizeEmails(body.to).filter(isEmail);
  const save = body.save !== false;
  const previewOnly = Boolean(body.preview_only);
  const wantSend = body.send !== false && !previewOnly;

  if (to.length === 0 && !body.smtp && !wantSend) {
    return NextResponse.json(
      { ok: false, error: "Add at least one partner email address." },
      { status: 400 },
    );
  }

  let cfg = await readMailFile();
  if (save && (to.length || body.smtp)) {
    cfg = await writeMailFile({
      digest_to: to.length ? to : cfg.digest_to,
      smtp_host: body.smtp?.host,
      smtp_port: body.smtp?.port,
      smtp_user: body.smtp?.user,
      smtp_from: body.smtp?.from,
      smtp_password: body.smtp?.password,
      clear_password: body.smtp?.clear_password,
    });
  }

  const status = publicStatus(cfg);
  const recipients = to.length ? to : status.recipients;

  // Save-only request (no send)
  if (!wantSend && body.send === false) {
    return NextResponse.json({
      ok: true,
      saved: true,
      ...status,
      recipients,
    });
  }

  if (wantSend && recipients.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Add at least one partner email before sending.",
        ...status,
      },
      { status: 400 },
    );
  }

  const args = [SCRIPT];
  if (previewOnly) args.push("--preview-only");
  else args.push("--send");
  for (const addr of recipients) {
    args.push("--to", addr);
  }
  if (save && recipients.length) args.push("--save-to");

  try {
    const output = await runPython(args);
    const jsonStart = output.indexOf("{");
    const parsed =
      jsonStart >= 0 ? JSON.parse(output.slice(jsonStart)) : { ok: true, raw: output };
    return NextResponse.json({
      ...parsed,
      recipients,
      mail: publicStatus(await readMailFile()),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Digest sample send failed",
        hint: "Run `python scripts/send_digest_samples.py --send --to you@example.com` from the repo root.",
        ...status,
      },
      { status: 500 },
    );
  }
}
