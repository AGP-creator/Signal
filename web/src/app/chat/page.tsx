"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";

const STARTERS = [
  "Build Monday partner meeting agenda",
  "LP process one-pager",
  "What's on IC this week?",
  "Bear case for AgentGate",
  "Diligence plan for SwarmGuard",
  "Prep me for a call with LatticeEval",
  "What should Judgment OS flag this week?",
  "Show founder radar hits",
  "What did we miss?",
  "Show proprietary windows",
  "Who should I call for syndicate on LatticeEval?",
  "Where is our white space vs peers?",
  "Research AgentGate",
  "Rebalance: are we overweight tactical vs 60/40?",
];

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "I'm Signal — grounded in the Thirdbase pipeline. Ask for Monday agendas, LP process, IC trails, bear cases, diligence, Judgment OS, peer intel, or research a company.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer || "No answer." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Request failed." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col">
      <PageHeader
        eyebrow="Partner OS"
        title="Partner chat"
        description="Ask about deals, sectors, peers — or type any company name for a full IC brief (pipeline-grounded, or researched if it's new)."
      />

      <div className="panel mt-7 flex flex-1 flex-col overflow-hidden !p-0">
        <div className="flex-1 space-y-3.5 overflow-y-auto p-5 scrollbar-thin md:p-6">
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={
                m.role === "user"
                  ? "ml-8 rounded-[12px] border border-[rgba(214,255,60,0.18)] bg-[var(--signal-dim)] px-4 py-3 text-[0.975rem] leading-relaxed"
                  : "mr-8 rounded-[12px] bg-[var(--panel-2)] px-4 py-3 text-[0.975rem] leading-relaxed whitespace-pre-wrap"
              }
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-3 text-[0.9375rem] text-[var(--muted)]">
              <div className="loading-bar w-24" />
              Thinking with pipeline context…
            </div>
          )}
        </div>

        <div className="border-t border-[var(--line)] p-4 md:p-5">
          <div className="mb-3.5 flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="chip">
                {s.length > 42 ? `${s.slice(0, 42)}…` : s}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask like a partner — or type a company…"
              className="field flex-1"
            />
            <button type="submit" disabled={busy} className="btn btn-primary shrink-0">
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
