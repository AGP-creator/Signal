import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ROOT = path.resolve(process.cwd(), "..");
const PY = path.join(ROOT, ".venv", "Scripts", "python.exe");
const SCRIPT = path.join(ROOT, "scripts", "watchlist_excel.py");
const TEMPLATE = path.join(ROOT, "data", "output", "Signal_Partner_Watchlist_Template.xlsx");

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

/** Download (or generate) the partner watchlist Excel template. */
export async function GET() {
  try {
    if (!fs.existsSync(TEMPLATE)) {
      const result = await runPython([SCRIPT, "--template"]);
      if (result.code !== 0) {
        return NextResponse.json(
          {
            ok: false,
            error: result.stderr || result.stdout || "Failed to build template",
          },
          { status: 500 },
        );
      }
    }
    if (!fs.existsSync(TEMPLATE)) {
      return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
    }
    const buf = fs.readFileSync(TEMPLATE);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="Signal_Partner_Watchlist_Template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Template failed" },
      { status: 500 },
    );
  }
}
