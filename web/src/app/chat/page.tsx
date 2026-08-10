"use client";

import { useState } from "react";

const STARTERS = [
  "What are the best deals in defense tech right now?",
  "What are three AI infrastructure sub-sectors nobody is talking about yet?",
  "Summarize what people are saying about AgentGate",
  "Who's quietly investing in robotics?",
  "Rebalance: are we overweight tactical vs 60/40?",
];

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "I'm Signal — grounded in the Thirdbase pipeline. Ask about deals, sectors, peers, or rebalancing.",
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
      <div>
        <h1 className="display text-4xl font-bold">Partner chat</h1>
        <p className="mt-2 text-[var(--muted)]">
          Answers are grounded in Supabase pipeline facts — not generic web chat.
        </p>
      </div>

      <div className="panel mt-6 flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin">
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={
                m.role === "user"
                  ? "ml-8 rounded-2xl bg-[var(--signal-dim)] px-4 py-3 text-sm"
                  : "mr-8 rounded-2xl bg-[var(--panel-2)] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              }
            >
              {m.content}
            </div>
          ))}
          {busy && <div className="text-sm text-[var(--muted)]">Thinking with pipeline context…</div>}
        </div>

        <div className="border-t border-[var(--line)] p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-[var(--line)] px-3 py-1 text-[11px] text-[var(--muted)] hover:border-[var(--signal)] hover:text-[var(--signal)]"
              >
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
              placeholder="Ask like a partner…"
              className="flex-1 rounded-full border border-[var(--line)] bg-transparent px-4 py-2.5 text-sm outline-none focus:border-[var(--signal)]"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-[var(--signal)] px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50"
            >
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
