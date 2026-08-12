import { NextResponse } from "next/server";
import {
  geminiBudgetStatus,
  isResearchAiEnabled,
  researchAiProvider,
  researchCompany,
  researchCompanyStream,
} from "@/lib/research";
import { fetchCommentary, fetchCompanies, fetchPeers } from "@/lib/data";
import type { Commentary, Company, PeerActivity } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function safePipelineContext(): Promise<{
  companies: Company[];
  commentary: Commentary[];
  peers: PeerActivity[];
  pipeline_error?: string;
}> {
  try {
    const [companies, commentary, peers] = await Promise.all([
      fetchCompanies(),
      fetchCommentary(),
      fetchPeers(),
    ]);
    return { companies, commentary, peers };
  } catch (e) {
    return {
      companies: [],
      commentary: [],
      peers: [],
      pipeline_error: e instanceof Error ? e.message : "Pipeline unavailable",
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = String(body.query || body.question || body.company || "").trim();
    if (!query) {
      return NextResponse.json({ error: "Missing company query" }, { status: 400 });
    }

    const stream =
      Boolean(body.stream) ||
      (req.headers.get("accept") || "").includes("text/event-stream") ||
      (req.headers.get("accept") || "").includes("application/x-ndjson");

    const ctx = await safePipelineContext();
    const researchCtx = {
      companies: ctx.companies,
      commentary: ctx.commentary,
      peers: ctx.peers,
    };

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
          };
          try {
            send({
              type: "meta",
              ai_enabled: isResearchAiEnabled(),
              ai_provider: researchAiProvider(),
              gemini_budget: geminiBudgetStatus(),
              ...(ctx.pipeline_error ? { pipeline_warning: ctx.pipeline_error } : {}),
            });
            for await (const event of researchCompanyStream(query, researchCtx)) {
              if (event.type === "brief") {
                send({
                  type: "brief",
                  brief: event.brief,
                  ai_enabled: isResearchAiEnabled(),
                  ai_provider: researchAiProvider(),
                  gemini_budget: geminiBudgetStatus(),
                });
              } else {
                send(event);
              }
            }
          } catch (e) {
            send({
              type: "error",
              error: e instanceof Error ? e.message : "Research failed",
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const brief = await researchCompany(query, researchCtx);
    return NextResponse.json({
      brief,
      ai_enabled: isResearchAiEnabled(),
      ai_provider: researchAiProvider(),
      gemini_budget: geminiBudgetStatus(),
      ...(ctx.pipeline_error ? { pipeline_warning: ctx.pipeline_error } : {}),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Research failed" },
      { status: 500 },
    );
  }
}
