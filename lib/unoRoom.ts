// ---------------------------------------------------------------------------
// lib/unoRoom.ts
// Wraps the pure UNO engine (lib/uno.ts) with lobby/room state that is synced
// via Supabase. Like the engine, all reducers here are pure.
//
// The whole room (lobby + in-progress game) lives in one jsonb value. NOTE:
// because there is no authoritative server, every client receives the full
// state — including all hands. The UI only renders your own hand + opponents'
// counts, so casual players never see others' cards, but this is not a hard
// anti-cheat boundary (that needs a server). Accepted MVP trade-off.
// ---------------------------------------------------------------------------
import {
  UnoState,
  UnoSettings,
  DEFAULT_SETTINGS,
  startGame,
} from "./uno";

export type RoomPhase = "waiting" | "playing" | "finished";

export interface UnoMember {
  id: string;
  name: string;
  ready: boolean;
}

export interface UnoRoom {
  phase: RoomPhase;
  hostId: string | null;
  members: UnoMember[];
  settings: UnoSettings;
  game: UnoState | null;
}

export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;

export function initialUnoRoom(): UnoRoom {
  return {
    phase: "waiting",
    hostId: null,
    members: [],
    settings: { ...DEFAULT_SETTINGS },
    game: null,
  };
}

/** Add a member in the lobby (or update their name on rejoin). First = host. */
export function addMember(room: UnoRoom, id: string, name: string): UnoRoom {
  const existing = room.members.find((m) => m.id === id);
  if (existing) {
    return { ...room, members: room.members.map((m) => (m.id === id ? { ...m, name } : m)) };
  }
  // New players can only join from the waiting lobby, capped at MAX_PLAYERS.
  if (room.phase !== "waiting" || room.members.length >= MAX_PLAYERS) return room;
  const members = [...room.members, { id, name, ready: false }];
  return { ...room, members, hostId: room.hostId ?? id };
}

export function setReady(room: UnoRoom, id: string, ready: boolean): UnoRoom {
  return { ...room, members: room.members.map((m) => (m.id === id ? { ...m, ready } : m)) };
}

/** Host-only settings update (caller enforces host check). */
export function setSettings(room: UnoRoom, settings: Partial<UnoSettings>): UnoRoom {
  return { ...room, settings: { ...room.settings, ...settings } };
}

/** Start a round. Requires the lobby + enough players. */
export function startUno(room: UnoRoom, rng: () => number = Math.random): UnoRoom {
  if (room.phase === "playing") return room;
  if (room.members.length < MIN_PLAYERS) return room;
  const game = startGame(
    room.members.map((m) => ({ id: m.id, name: m.name })),
    room.settings,
    rng
  );
  return { ...room, phase: "playing", game };
}

/** Reflect the engine's finished flag into the room phase after a game action. */
export function syncPhase(room: UnoRoom): UnoRoom {
  if (room.game?.phase === "finished" && room.phase !== "finished") {
    return { ...room, phase: "finished" };
  }
  return room;
}

/** Back to the lobby (keep roster, clear the game, reset ready flags). */
export function backToLobby(room: UnoRoom): UnoRoom {
  return {
    ...room,
    phase: "waiting",
    game: null,
    members: room.members.map((m) => ({ ...m, ready: false })),
  };
}

// --- Normalization (guards malformed/old rows from crashing clients) -------

function isUnoState(g: unknown): g is UnoState {
  if (!g || typeof g !== "object") return false;
  const s = g as Record<string, unknown>;
  return Array.isArray(s.players) && Array.isArray(s.drawPile) && Array.isArray(s.discardPile);
}

export function normalizeUnoRoom(raw: unknown): UnoRoom {
  if (!raw || typeof raw !== "object") return initialUnoRoom();
  const r = raw as Record<string, unknown>;

  const members: UnoMember[] = Array.isArray(r.members)
    ? (r.members as unknown[])
        .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
        .filter((m) => typeof m.id === "string")
        .map((m) => ({
          id: m.id as string,
          name: typeof m.name === "string" ? m.name : "Player",
          ready: Boolean(m.ready),
        }))
    : [];

  const phase: RoomPhase = (["waiting", "playing", "finished"] as const).includes(
    r.phase as RoomPhase
  )
    ? (r.phase as RoomPhase)
    : "waiting";

  const game = isUnoState(r.game) ? (r.game as UnoState) : null;

  return {
    phase: game ? phase : "waiting",
    hostId: typeof r.hostId === "string" ? r.hostId : members[0]?.id ?? null,
    members,
    settings: { ...DEFAULT_SETTINGS, ...(typeof r.settings === "object" && r.settings ? r.settings : {}) },
    game,
  };
}
