"use client";

import { useCallback, useEffect, useState } from "react";
import {
  supabase,
  isSupabaseConfigured,
  MESSAGES_TABLE,
  ChatMessage,
  BOT_ID,
  BOT_NAME,
} from "@/lib/supabase";

const HISTORY_LIMIT = 60; // how many recent messages to load on join

export interface UseChat {
  messages: ChatMessage[];
  /** Send a message as the given author (no-op if author is null). */
  send: (text: string) => void;
  /** Post an automated BingoBot game-event message. */
  postBot: (text: string) => void;
}

/**
 * Realtime room chat backed by the `messages` table.
 *  - Loads recent history on mount.
 *  - Subscribes to INSERTs for this room and appends them (the inserter also
 *    receives its own row, so no optimistic update is needed — and we dedupe
 *    by id just in case).
 *  - `send` / `postBot` are plain INSERTs, so concurrent messages never clobber
 *    each other (unlike full-row game-state writes).
 */
export function useChat(
  room: string,
  author: { id: string; name: string } | null
): UseChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;

    async function loadHistory() {
      const { data } = await supabase!
        .from(MESSAGES_TABLE)
        .select("*")
        .eq("room", room)
        .order("created_at", { ascending: true })
        .limit(HISTORY_LIMIT);
      if (!cancelled && data) setMessages(data as ChatMessage[]);
    }
    loadHistory();

    const channel = supabase
      .channel(`chat:${room}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: MESSAGES_TABLE, filter: `room=eq.${room}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase!.removeChannel(channel);
    };
  }, [room]);

  const insert = useCallback(
    async (text: string, kind: "user" | "bot", name: string, id: string) => {
      if (!supabase) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      await supabase.from(MESSAGES_TABLE).insert({
        room,
        author: name,
        author_id: id,
        kind,
        text: trimmed.slice(0, 300),
      });
    },
    [room]
  );

  const send = useCallback(
    (text: string) => {
      if (author) insert(text, "user", author.name, author.id);
    },
    [author, insert]
  );

  const postBot = useCallback(
    (text: string) => insert(text, "bot", BOT_NAME, BOT_ID),
    [insert]
  );

  return { messages, send, postBot };
}
