"use client";

import { useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import {
  copyChatText,
  downloadChatMarkdown,
  shareChatText,
} from "@/lib/chatStore";
import { cn } from "@/lib/utils";

type Props = {
  markdown: string;
  filename: string;
  shareTitle: string;
  className?: string;
  size?: "sm" | "md";
};

export function ChatExportMenu({
  markdown,
  filename,
  shareTitle,
  className,
  size = "sm",
}: Props) {
  const [done, setDone] = useState<string | null>(null);
  const btn = size === "sm" ? "chat-action-btn" : "btn btn-ghost btn-sm";

  async function run(id: string, fn: () => void | Promise<void>) {
    await fn();
    setDone(id);
    setTimeout(() => setDone(null), 1400);
  }

  return (
    <div className={cn("chat-export-menu", className)}>
      <button
        type="button"
        className={btn}
        title="Copy"
        onClick={() => run("copy", () => copyChatText(markdown))}
      >
        <Copy className="size-3.5" aria-hidden />
        <span>{done === "copy" ? "Copied" : "Copy"}</span>
      </button>
      <button
        type="button"
        className={btn}
        title="Export markdown"
        onClick={() =>
          run("export", () => downloadChatMarkdown(filename, markdown))
        }
      >
        <Download className="size-3.5" aria-hidden />
        <span>{done === "export" ? "Saved" : "Export"}</span>
      </button>
      <button
        type="button"
        className={btn}
        title="Share"
        onClick={() =>
          run("share", async () => {
            await shareChatText(shareTitle, markdown);
          })
        }
      >
        <Share2 className="size-3.5" aria-hidden />
        <span>{done === "share" ? "Shared" : "Share"}</span>
      </button>
    </div>
  );
}
