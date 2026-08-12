/**
 * Chat history — local partner store (same pattern as Partner Log / overrides).
 */

import type { GroundingStep } from "@/lib/askGrounding";
import type { CompanyBrief } from "@/lib/research";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  brief?: CompanyBrief;
  mode?: string;
  searches?: GroundingStep[];
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

const STORE_KEY = "signal.chat.history.v1";
const ACTIVE_KEY = "signal.chat.active.v1";
const EVENT = "signal:chat-changed";

export const WELCOME_MESSAGE =
  "Ask about a **great deal**, **sectors of tomorrow**, or **news worth reading** — or name a company for a scout brief.\n\nAnswers stay grounded in the same store as the Venture agent (`/os`).";

export function newChatMessage(
  role: ChatMessage["role"],
  content: string,
  extra?: Partial<Omit<ChatMessage, "id" | "role" | "content" | "createdAt">>,
): ChatMessage {
  return {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function loadChatSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChatSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(sessions));
  emit();
}

export function loadActiveChatId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveChatId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
  emit();
}

export function getChatSession(id: string): ChatSession | null {
  return loadChatSessions().find((s) => s.id === id) || null;
}

export function deriveChatTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const t = firstUser.content.trim().replace(/\s+/g, " ");
  return t.length > 56 ? `${t.slice(0, 53)}…` : t;
}

export function createChatSession(messages: ChatMessage[] = []): ChatSession {
  const now = new Date().toISOString();
  const session: ChatSession = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: deriveChatTitle(messages),
    messages,
    createdAt: now,
    updatedAt: now,
  };
  const all = loadChatSessions();
  saveChatSessions([session, ...all]);
  setActiveChatId(session.id);
  return session;
}

export function upsertChatSession(session: ChatSession): ChatSession {
  const next = { ...session, updatedAt: new Date().toISOString() };
  if (!next.title.trim()) next.title = deriveChatTitle(next.messages);
  const all = loadChatSessions();
  const idx = all.findIndex((s) => s.id === next.id);
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  saveChatSessions(all);
  return next;
}

export function deleteChatSession(id: string) {
  const all = loadChatSessions().filter((s) => s.id !== id);
  saveChatSessions(all);
  if (loadActiveChatId() === id) {
    setActiveChatId(all[0]?.id || null);
  }
}

export function formatMessageMarkdown(
  message: ChatMessage,
  priorUser?: ChatMessage | null,
): string {
  const lines: string[] = [];
  if (message.role === "assistant" && priorUser) {
    lines.push(`## Question`, "", priorUser.content, "");
  }
  lines.push(
    message.role === "user" ? "## Question" : "## Answer",
    "",
    message.content,
  );
  if (message.mode) lines.push("", `Mode: ${message.mode.replace(/_/g, " ")}`);
  if (message.searches?.length) {
    lines.push("", "### Grounding trail");
    for (const s of message.searches) {
      lines.push(`- **${s.name}** — ${s.display}`);
    }
  }
  if (message.brief) {
    lines.push(
      "",
      `### Scout brief — ${message.brief.name}`,
      message.brief.one_liner || "",
    );
    if (message.brief.recommendation) {
      lines.push(`Recommendation: ${message.brief.recommendation}`);
    }
  }
  return lines.filter((l) => l !== undefined).join("\n");
}

export function formatSessionMarkdown(session: ChatSession): string {
  const lines = [
    `# Signal chat — ${session.title}`,
    "",
    `Exported ${new Date().toLocaleString()}`,
    "",
  ];
  for (let i = 0; i < session.messages.length; i++) {
    const m = session.messages[i];
    const prior = m.role === "assistant" ? session.messages[i - 1] : null;
    lines.push(formatMessageMarkdown(m, prior?.role === "user" ? prior : null));
    lines.push("", "---", "");
  }
  return lines.join("\n").trim();
}

export async function copyChatText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function downloadChatMarkdown(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareChatText(title: string, text: string) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch (err) {
      if ((err as Error).name === "AbortError") return false;
    }
  }
  await copyChatText(text);
  return false;
}

export function chatExportFilename(base: string) {
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return `Signal_Chat_${slug || "export"}.md`;
}

export const CHAT_CHANGED_EVENT = EVENT;
