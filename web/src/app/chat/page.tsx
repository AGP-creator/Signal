"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Cpu, Radio, Sparkles } from "lucide-react";
import { ChatExportMenu } from "@/components/ChatExportMenu";
import { ChatHistoryPanel } from "@/components/ChatHistoryPanel";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { CompanyBriefView } from "@/components/CompanyBriefView";
import { PageHeader } from "@/components/ui";
import type { GroundingStep } from "@/lib/askGrounding";
import {
  chatExportFilename,
  createChatSession,
  deriveChatTitle,
  formatMessageMarkdown,
  formatSessionMarkdown,
  getChatSession,
  loadActiveChatId,
  newChatMessage,
  setActiveChatId,
  upsertChatSession,
  WELCOME_MESSAGE,
  type ChatMessage,
  type ChatSession,
} from "@/lib/chatStore";
import type { CompanyBrief } from "@/lib/research";
import { cn } from "@/lib/utils";

const STARTERS = [
  "Monday partner agenda",
  "What are three AI infrastructure sub-sectors nobody is talking about yet?",
  "Are we overweight tactical vs 60/40?",
  "Top Deep Dive deals",
  "News worth reading",
  "Partner meeting agenda",
];

type Msg = ChatMessage;

function newMsg(
  role: Msg["role"],
  content: string,
  extra?: Partial<Omit<Msg, "id" | "role" | "content" | "createdAt">>,
): Msg {
  return newChatMessage(role, content, extra);
}

function welcomeOnly(): Msg[] {
  return [newMsg("assistant", WELCOME_MESSAGE)];
}

function GroundingTrail({ steps }: { steps: GroundingStep[] }) {
  return (
    <details className="chat-grounding">
      <summary className="chat-grounding-head">
        <Radio className="size-3.5 opacity-80" aria-hidden />
        <span>Grounding trail</span>
        <span className="chat-grounding-count">{steps.length}</span>
      </summary>
      <ol className="chat-grounding-list">
        {steps.map((s, si) => (
          <li key={`${s.name}-${si}`} className="chat-grounding-step">
            <span className="chat-grounding-dot" aria-hidden />
            <span className="chat-grounding-name mono">{s.name}</span>
            <span className="chat-grounding-display">{s.display}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function ThinkingState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="chat-msg chat-msg-assistant"
    >
      <div className="chat-msg-avatar" aria-hidden>
        <Sparkles className="size-4" />
      </div>
      <div className="chat-msg-body chat-thinking">
        <div className="chat-thinking-pulse" />
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[0.875rem] text-[var(--text)]">
            <span className="chat-thinking-label">Synthesizing</span>
            <span className="chat-thinking-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </div>
          <p className="text-[0.8125rem] text-[var(--muted)]">
            Pipeline check → intent match → grounded store
          </p>
          <div className="loading-bar mt-1 w-36" />
          <p className="text-[0.75rem] text-[var(--faint)]">
            Live agent steps on{" "}
            <Link href="/search" className="link-quiet">
              Search
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>(welcomeOnly());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const bootstrapped = useRef(false);

  const storedMessages = messages.filter(
    (m) => m.content !== WELCOME_MESSAGE || m.role === "user",
  );
  const hasStoredConversation = storedMessages.some((m) => m.role === "user");
  const activeSession: ChatSession | null =
    sessionId && hasStoredConversation
      ? {
          id: sessionId,
          title: deriveChatTitle(storedMessages),
          messages: storedMessages,
          createdAt: storedMessages[0]?.createdAt || new Date().toISOString(),
          updatedAt: storedMessages[storedMessages.length - 1]?.createdAt || new Date().toISOString(),
        }
      : null;

  useEffect(() => {
    const active = loadActiveChatId();
    if (active) {
      const session = getChatSession(active);
      if (session?.messages.length) {
        setSessionId(session.id);
        setMessages(session.messages);
        setReady(true);
        return;
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (bootstrapped.current || !ready || typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    if (!q) return;
    bootstrapped.current = true;
    void send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function persist(nextMessages: Msg[], id: string) {
    const stored = nextMessages.filter(
      (m) => m.content !== WELCOME_MESSAGE || m.role === "user",
    );
    if (!stored.some((m) => m.role === "user")) return;
    upsertChatSession({
      id,
      title: deriveChatTitle(stored),
      messages: stored,
      createdAt: stored[0]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function openSession(id: string) {
    const session = getChatSession(id);
    if (!session) return;
    setSessionId(session.id);
    setActiveChatId(session.id);
    setMessages(session.messages.length ? session.messages : welcomeOnly());
    setInput("");
  }

  function startNewChat() {
    setSessionId(null);
    setActiveChatId(null);
    setMessages(welcomeOnly());
    setInput("");
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");

    let sid = sessionId;
    const userMsg = newMsg("user", question);
    let nextMessages: Msg[];

    if (!sid) {
      const session = createChatSession([userMsg]);
      sid = session.id;
      setSessionId(sid);
      nextMessages = [userMsg];
    } else {
      nextMessages = [...messages.filter((m) => m.content !== WELCOME_MESSAGE), userMsg];
    }

    setMessages(nextMessages);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          (data as { error?: string }).error ||
          `Chat failed (${res.status}). Check the API is up and Supabase is reachable.`;
        const withErr = [...nextMessages, newMsg("assistant", err)];
        setMessages(withErr);
        persist(withErr, sid);
        return;
      }
      const brief = (data as { brief?: CompanyBrief }).brief;
      const mode = (data as { mode?: string }).mode;
      const searches = (data as { searches?: GroundingStep[] }).searches;
      const answer =
        (data as { answer?: string }).answer ||
        (brief ? `Scout brief for ${brief.name}` : "No answer.");
      const assistantMsg = newMsg("assistant", brief
        ? brief.in_pipeline
          ? `Pipeline IC brief for **${brief.name}**.`
          : `Agentic scout brief for **${brief.name}** — ${brief.sources?.length || 0} public sources.`
        : answer, {
        brief,
        mode,
        searches,
      });
      const withAnswer = [...nextMessages, assistantMsg];
      setMessages(withAnswer);
      persist(withAnswer, sid);
    } catch {
      const withErr = [
        ...nextMessages,
        newMsg("assistant", "Network error — could not reach `/api/chat`. Retry in a moment."),
      ];
      setMessages(withErr);
      persist(withErr, sid);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[min(72dvh,720px)] w-full min-w-0 flex-col space-y-4 md:space-y-5">
      <PageHeader
        eyebrow="Chat"
        title="Ask Signal"
        description="Short partner answers — structured, scannable, grounded. History stays on this device."
        actions={
          activeSession ? (
            <ChatExportMenu
              markdown={formatSessionMarkdown(activeSession)}
              filename={chatExportFilename(activeSession.title)}
              shareTitle={`Signal chat — ${activeSession.title}`}
              size="md"
            />
          ) : null
        }
      />

      <div className="chat-layout">
        <ChatHistoryPanel
          activeId={sessionId}
          onSelect={openSession}
          onNew={startNewChat}
        />

        <div className="chat-shell panel flex flex-1 flex-col overflow-hidden !p-0 shadow-[var(--shadow-panel)]">
          <div className="chat-shell-rail" aria-hidden />
          <div className="flex-1 space-y-7 overflow-y-auto px-4 py-5 scrollbar-thin md:px-6 md:py-6">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const priorUser =
                  m.role === "assistant" && messages[i - 1]?.role === "user"
                    ? messages[i - 1]
                    : null;
                const msgMd = formatMessageMarkdown(m, priorUser);
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3"
                  >
                    {m.role === "user" ? (
                      <div className="chat-msg chat-msg-user">
                        <div className="chat-user-bubble">{m.content}</div>
                      </div>
                    ) : (
                      <div className="chat-msg chat-msg-assistant">
                        <div className="chat-msg-avatar" aria-hidden>
                          <Sparkles className="size-4" />
                        </div>
                        <div className="chat-msg-body">
                          <div className="chat-msg-meta">
                            <span className="chat-msg-brand">Signal</span>
                            {m.mode ? (
                              <span className="chat-msg-mode mono">
                                {m.mode.replace(/_/g, " ")}
                              </span>
                            ) : null}
                            {m.content !== WELCOME_MESSAGE ? (
                              <ChatExportMenu
                                markdown={msgMd}
                                filename={chatExportFilename(
                                  priorUser?.content || m.content.slice(0, 32),
                                )}
                                shareTitle={
                                  priorUser
                                    ? `Signal — ${priorUser.content.slice(0, 64)}`
                                    : "Signal answer"
                                }
                                className="ml-auto"
                              />
                            ) : null}
                          </div>
                          <ChatMarkdown
                            content={m.content}
                            onSuggestion={(q) => void send(q)}
                          />
                          {m.mode === "agentic_scout" && (
                            <div className="chat-msg-aside">
                              Mode: agentic web scout ·{" "}
                              <Link href="/search" className="chat-md-link">
                                Open Search for live agent steps
                              </Link>
                            </div>
                          )}
                          {m.searches && m.searches.length > 0 ? (
                            <GroundingTrail steps={m.searches} />
                          ) : null}
                        </div>
                      </div>
                    )}
                    {m.brief && (
                      <div className="chat-brief-wrap w-full">
                        <CompanyBriefView brief={m.brief} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {busy ? <ThinkingState /> : null}
            <div ref={bottomRef} />
          </div>

          <div className="chat-composer">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  disabled={busy}
                  className="chat-starter"
                >
                  <Cpu className="size-3 opacity-70" aria-hidden />
                  {s}
                </button>
              ))}
            </div>
            <form
              className="chat-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Company name or partner question…"
                className="chat-input"
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className={cn("chat-send", (!input.trim() || busy) && "opacity-50")}
                aria-label="Send"
              >
                <ArrowUp className="size-4" strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
