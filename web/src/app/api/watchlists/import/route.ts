import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ROOT = path.resolve(process.cwd(), "..");
const PY = path.join(ROOT, ".venv", "Scripts", "python.exe");
const SCRIPT = path.join(ROOT, "scripts", "watchlist_excel.py");

function runPython(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
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
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function parseJson(stdout: string) {
  const text = stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(text || "No JSON from importer");
  return JSON.parse(text.slice(start, end + 1));
}

/** Preview or commit a partner watchlist Excel upload. */
export async function POST(req: Request) {
  let tmpPath: string | null = null;
  try {
    const form = await req.formData();
    const file = form.get("file");
    const partner = String(form.get("partner_name") || "Partner").trim() || "Partner";
    const mode = String(form.get("mode") || "preview").toLowerCase() === "commit" ? "commit" : "preview";

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
    }
    const name = file.name || "watchlist.xlsx";
    if (!/\.(xlsx|xlsm|xls)$/i.test(name)) {
      return NextResponse.json(
        { ok: false, error: "Upload an Excel .xlsx file" },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    tmpPath = path.join(os.tmpdir(), `signal_watchlist_${Date.now()}_${name.replace(/[^\w.-]+/g, "_")}`);
    fs.writeFileSync(tmpPath, buf);

    const flag = mode === "commit" ? "--commit" : "--preview";
    const result = await runPython([SCRIPT, flag, tmpPath, "--partner", partner]);
    let payload: Record<string, unknown>;
    try {
      payload = parseJson(result.stdout);
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.stderr ||
            (e instanceof Error ? e.message : "Importer failed") ||
            result.stdout,
        },
        { status: 500 },
      );
    }

    if (result.code !== 0 || payload.ok === false) {
      return NextResponse.json(
        { ok: false, error: (payload.error as string) || result.stderr || "Import failed", ...payload },
        { status: 400 },
      );
    }

    return NextResponse.json({ ...payload, mode, partner_name: partner });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
    }
  }
}
