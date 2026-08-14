import { spawn } from "child_process";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function shortError(raw: string): string {
  const text = raw.trim();
  if (!text) return "Refresh failed";
  // Prefer the last non-empty Error/Exception line from a traceback.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const exception = [...lines]
    .reverse()
    .find((l) => /^[A-Za-z_][\w.]*Error:|^[A-Za-z_][\w.]*Exception:/.test(l));
  if (exception) return exception.slice(0, 160);
  if (/Traceback|File ".*", line \d+/i.test(text) || text.length > 160) {
    return "Pipeline refresh failed";
  }
  return text.slice(0, 160);
}

export async function POST() {
  const root = path.resolve(process.cwd(), "..");
  const py = path.join(root, ".venv", "Scripts", "python.exe");
  const script = path.join(root, "scripts", "refresh.py");

  try {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(py, [script], {
        cwd: root,
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
    const parsed = jsonStart >= 0 ? JSON.parse(output.slice(jsonStart)) : { ok: true, raw: output };
    return NextResponse.json(parsed);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Refresh failed";
    return NextResponse.json(
      {
        ok: false,
        error: shortError(detail),
        hint: "Run `python scripts/refresh.py` from the repo root if the API cannot spawn the venv.",
      },
      { status: 500 },
    );
  }
}
