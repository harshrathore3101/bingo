// ---------------------------------------------------------------------------
// lib/game.ts
// Pure, serializable game state + reducers for classic turn-based Bingo.
// The ENTIRE state lives in one object that is persisted to the room row and
// synced via Supabase Realtime. All transitions are pure functions so they are
// deterministic and easy to test.
// ---------------------------------------------------------------------------
import { generateCard, cardLineCount, BINGO_LETTERS } from "./bingo";

export interface Player {
  id: string; // stable client id
  name: string;
  card: number[]; // 25 numbers (1–25) shuffled — this player's own card
}

/** One number called during the game, with who called it (for the log). */
export interface Call {
  value: number; // 1–25
  by: string; // player id who called it
  byName: string; // denormalized name for display
}

export type Phase = "lobby" | "playing" | "finished";

export interface GameState {
  phase: Phase;
  players: Player[];
  turn: number; // index into players whose turn it is
  called: Call[]; // numbers called so far, in order
  winnerId: string | null;
  winnerName: string | null;
}

/** Letters needed to win (5 completed lines → B-I-N-G-O). */
export const LINES_TO_WIN = BINGO_LETTERS.length;

export function initialState(): GameState {
  return {
    phase: "lobby",
    players: [],
    turn: 0,
    called: [],
    winnerId: null,
    winnerName: null,
  };
}

/** Set of numbers that have been called (for marking cards). */
export function calledSet(state: GameState): Set<number> {
  return new Set(state.called.map((c) => c.value));
}

/** The player whose turn it currently is (null unless playing). */
export function currentPlayer(state: GameState): Player | null {
  if (state.phase !== "playing" || state.players.length === 0) return null;
  return state.players[state.turn % state.players.length] ?? null;
}

/** Completed-line count for a single player given the called numbers. */
export function playerLineCount(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 0;
  return cardLineCount(player.card, calledSet(state));
}

// --- Reducers --------------------------------------------------------------

/** Add a player (or update their name if they already joined / rejoined). */
export function addPlayer(state: GameState, id: string, name: string): GameState {
  const existing = state.players.find((p) => p.id === id);
  if (existing) {
    return {
      ...state,
      players: state.players.map((p) => (p.id === id ? { ...p, name } : p)),
    };
  }
  // New players always get a fresh card so they can join even mid-game.
  return {
    ...state,
    players: [...state.players, { id, name, card: generateCard() }],
  };
}

/** Begin a round: deal fresh cards to everyone and reset calls/turn. */
export function startGame(state: GameState): GameState {
  if (state.players.length === 0) return state;
  return {
    ...state,
    phase: "playing",
    turn: 0,
    called: [],
    winnerId: null,
    winnerName: null,
    players: state.players.map((p) => ({ ...p, card: generateCard() })),
  };
}

/**
 * Call a number on the current player's turn. Marks it on every card, checks
 * for a winner, and otherwise advances to the next player.
 * No-ops (returns state unchanged) if it isn't `byId`'s turn or the number was
 * already called — this guards against stale/duplicate clicks racing in.
 */
export function callNumber(state: GameState, value: number, byId: string): GameState {
  if (state.phase !== "playing") return state;
  const cur = currentPlayer(state);
  if (!cur || cur.id !== byId) return state; // not your turn
  if (state.called.some((c) => c.value === value)) return state; // already called

  const called: Call[] = [...state.called, { value, by: byId, byName: cur.name }];
  const set = new Set(called.map((c) => c.value));

  // Did anyone reach BINGO? The caller wins ties (they "called it"); otherwise
  // the earliest-joined player with a completed card wins.
  const bingoPlayers = state.players.filter(
    (p) => cardLineCount(p.card, set) >= LINES_TO_WIN
  );
  if (bingoPlayers.length > 0) {
    const winner = bingoPlayers.find((p) => p.id === byId) ?? bingoPlayers[0];
    return {
      ...state,
      called,
      phase: "finished",
      winnerId: winner.id,
      winnerName: winner.name,
    };
  }

  return { ...state, called, turn: (state.turn + 1) % state.players.length };
}

/** Back to the lobby (keeps the roster, deals fresh cards). */
export function resetToLobby(state: GameState): GameState {
  return {
    ...state,
    phase: "lobby",
    turn: 0,
    called: [],
    winnerId: null,
    winnerName: null,
    players: state.players.map((p) => ({ ...p, card: generateCard() })),
  };
}

/** Leaderboard for the win screen: players ranked by completed lines. */
export function leaderboard(state: GameState): Array<{ player: Player; lines: number }> {
  const set = calledSet(state);
  return state.players
    .map((player) => ({ player, lines: cardLineCount(player.card, set) }))
    .sort((a, b) => b.lines - a.lines);
}
