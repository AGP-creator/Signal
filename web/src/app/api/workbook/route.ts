import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ROOT = path.resolve(process.cwd(), "..");
const FILE_PATH = path.join(ROOT, "data", "output", "Thirdbase_Deal_Pipeline.xlsx");
const PY = path.join(ROOT, ".venv", "Scripts", "python.exe");
const EXPORT_SCRIPT = path.join(ROOT, "scripts", "export_workbook.py");

function workbookMeta() {
  if (!fs.existsSync(FILE_PATH)) return null;
  const st = fs.statSync(FILE_PATH);
  return {
    exists: true,
    bytes: st.size,
    mtime: st.mtime.toISOString(),
    path: "data/output/Thirdbase_Deal_Pipeline.xlsx",
    filename: "Thirdbase_Deal_Pipeline.xlsx",
  };
}

/** Metadata only — partners check freshness without downloading. */
export async function HEAD() {
  const meta = workbookMeta();
  if (!meta) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Length": String(meta.bytes),
      "Last-Modified": new Date(meta.mtime).toUTCString(),
      "X-Signal-Workbook-Bytes": String(meta.bytes),
      "Cache-Control": "no-store",
    },
  });
}

/** Serve the regenerated Excel workbook partners debate in. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("meta") === "1") {
    const meta = workbookMeta();
    if (!meta) {
      return NextResponse.json(
        { ok: false, error: "Workbook not found. Run Refresh or POST /api/workbook." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, ...meta });
  }

  if (!fs.existsSync(FILE_PATH)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Workbook not found. Run Refresh pipeline or Rebuild Excel first.",
      },
      { status: 404 },
    );
  }

  const buf = fs.readFileSync(FILE_PATH);
  const st = fs.statSync(FILE_PATH);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Thirdbase_Deal_Pipeline.xlsx"',
      "Cache-Control": "no-store",
      "Last-Modified": st.mtime.toUTCString(),
      "X-Signal-Workbook-Bytes": String(st.size),
    },
  });
}

/** Fast Excel-only regen (no live ingest). Prefer Refresh for full pipeline. */
export async function POST() {
  try {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(PY, [EXPORT_SCRIPT], {
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

    const jsonStart = output.indexOf("{");
    const parsed =
      jsonStart >= 0 ? JSON.parse(output.slice(jsonStart)) : { ok: true, raw: output };
    const meta = workbookMeta();
    return NextResponse.json({ ...parsed, workbook: meta });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Excel export failed",
        hint: "Run `python scripts/export_workbook.py` from the repo root.",
      },
      { status: 500 },
    );
  }
}
