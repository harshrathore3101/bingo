"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChatMessage } from "@/lib/supabase";
import { playerColor } from "@/lib/colors";

interface ChatPanelProps {
  messages: ChatMessage[];
  meId: string;
  /** Whether the local user has joined and can send messages. */
  canChat: boolean;
  onSend: (text: string) => void;
}

/**
 * In-room chat: a scrolling message list plus a composer. BingoBot (kind:
 * "bot") game-event messages are styled distinctly from player messages.
 */
export default function ChatPanel({ messages, meId, canChat, onSend }: ChatPanelProps) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="glass rounded-2xl p-4 w-full max-w-xs flex flex-col">
      <h3 className="text-sm uppercase tracking-wider text-cyan-200/70 mb-3">Chat</h3>

      <div className="flex flex-col gap-2 h-56 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-white/40 text-sm">No messages yet — say hi 👋</p>
        ) : (
          messages.map((m) => <Row key={m.id} m={m} meId={meId} />)
        )}
        <div ref={endRef} />
      </div>

      {canChat ? (
        <div className="flex gap-2 mt-3">
          <input
            value={text}
            maxLength={300}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Message…"
            className="flex-1 min-w-0 bg-black/40 border border-white/15 focus:border-neon-blue rounded-lg px-3 py-2 text-sm text-cyan-100 outline-none transition-colors"
          />
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={submit}
            className="px-3 py-2 rounded-lg border border-neon-pink text-neon-pink text-sm font-semibold hover:bg-neon-pink/20 transition-colors"
          >
            Send
          </motion.button>
        </div>
      ) : (
        <p className="text-white/40 text-xs mt-3">Join the room to chat.</p>
      )}
    </div>
  );
}

/** A single message row — bot messages and own/other player messages differ. */
function Row({ m, meId }: { m: ChatMessage; meId: string }) {
  if (m.kind === "bot") {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs text-center text-neon-yellow/90 italic"
        style={{ color: "#fdfd00cc" }}
      >
        🤖 {m.text}
      </motion.p>
    );
  }

  const isMe = m.author_id === meId;
  const color = playerColor(m.author_id);
  return (
    <motion.div
      initial={{ opacity: 0, x: isMe ? 8 : -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`text-sm leading-snug ${isMe ? "text-right" : "text-left"}`}
    >
      <span className="font-semibold" style={{ color }}>
        {m.author}
        {isMe && <span className="text-white/40 font-normal"> (you)</span>}
      </span>
      <span className="text-cyan-100/90">: {m.text}</span>
    </motion.div>
  );
}
