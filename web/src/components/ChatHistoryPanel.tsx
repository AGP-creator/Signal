"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import {
  CHAT_CHANGED_EVENT,
  deleteChatSession,
  loadChatSessions,
  type ChatSession,
} from "@/lib/chatStore";
import { cn, fmtWhen } from "@/lib/utils";

type Props = {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
};

export function ChatHistoryPanel({ activeId, onSelect, onNew }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    function refresh() {
      setSessions(loadChatSessions());
    }
    refresh();
    window.addEventListener(CHAT_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CHAT_CHANGED_EVENT, refresh);
  }, []);

  return (
    <aside className="chat-history panel flex flex-col !p-0">
      <div className="chat-history-head">
        <div>
          <div className="label-caps">History</div>
          <p className="mt-1 text-[0.75rem] leading-snug text-[var(--muted)]">
            Saved on this device
          </p>
        </div>
        <button type="button" className="chat-action-btn" onClick={onNew}>
          <MessageSquarePlus className="size-3.5" aria-hidden />
          New
        </button>
      </div>
      <div className="chat-history-list scrollbar-thin">
        {sessions.length === 0 ? (
          <p className="px-3 py-4 text-[0.8125rem] text-[var(--muted)]">
            No saved chats yet. Ask a question to start.
          </p>
        ) : (
          sessions.map((s) => {
            const active = s.id === activeId;
            return (
              <div key={s.id} className="chat-history-row group">
                <button
                  type="button"
                  className={cn("chat-history-item", active && "chat-history-item-active")}
                  onClick={() => onSelect(s.id)}
                >
                  <span className="chat-history-title">{s.title}</span>
                  <span className="chat-history-meta mono">
                    {s.messages.length} msg · {fmtWhen(s.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="chat-history-delete"
                  title="Delete chat"
                  onClick={() => deleteChatSession(s.id)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
