// ---------------------------------------------------------------------------
// lib/supabase.ts
// A single shared Supabase browser client used for realtime room sync.
// Credentials come from public env vars (safe — the anon key is meant to be
// exposed to the browser and is gated by Row Level Security policies).
// ---------------------------------------------------------------------------
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { GameState } from "./game";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Accept either the legacy "anon" key or the newer "publishable" key
// (sb_publishable_...). Both are browser-safe and gated by RLS.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True only when both env vars are present, so the UI can show setup help. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The client is `null` when env vars are missing so the app can still render
 * (and show a friendly "configure Supabase" message) instead of crashing.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      realtime: { params: { eventsPerSecond: 20 } },
    })
  : null;

/** Shape of a row in the `rooms` table. The whole game lives in `state`. */
export interface RoomRow {
  id: string; // room code (e.g. "1234")
  state: GameState; // full game state (jsonb)
  updated_at: string;
}

export const ROOMS_TABLE = "rooms";

/**
 * A chat message in a room. Stored in its own table (not the game-state row)
 * so concurrent messages are independent INSERTs that never overwrite each
 * other. `kind: "bot"` marks automated BingoBot game-event messages.
 */
export interface ChatMessage {
  id: string;
  room: string;
  author: string; // display name, or "BingoBot"
  author_id: string; // player id, or "bot"
  kind: "user" | "bot";
  text: string;
  created_at: string;
}

export const MESSAGES_TABLE = "messages";
export const BOT_ID = "bot";
export const BOT_NAME = "BingoBot";

/** Row in the `uno_rooms` table — the whole UNO room/game lives in `state`. */
export interface UnoRoomRow {
  id: string; // room code
  state: unknown; // UnoRoom (jsonb)
  updated_at: string;
}

export const UNO_ROOMS_TABLE = "uno_rooms";
