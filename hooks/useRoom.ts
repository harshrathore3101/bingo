"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured, ROOMS_TABLE, RoomRow } from "@/lib/supabase";
import {
  GameState,
  Player,
  initialState,
  addPlayer,
  startGame,
  callNumber,
  skipTurn,
  resetToLobby,
  currentPlayer,
} from "@/lib/game";

const CLIENT_ID_KEY = "bingo-client-id";
const NAME_KEY = "bingo-player-name";

/** A stable per-browser id so refresh keeps the same player identity. */
function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export interface UseRoom {
  state: GameState | null;
  loading: boolean;
  error: string | null;
  clientId: string;
  /** This client's player record, if they've joined. */
  me: Player | null;
  /** Whether it's this client's turn to call a number. */
  isMyTurn: boolean;
  /** The player whose turn it is. */
  current: Player | null;
  /** Number of clients currently connected (presence). */
  online: number;
  /** Remembered name to prefill the join form. */
  savedName: string;
  join: (name: string) => Promise<void>;
  start: () => void;
  call: (value: number) => void;
  skip: () => void;
  playAgain: () => void;
  backToLobby: () => void;
}

/**
 * Connects to one room and keeps the full turn-based game state in sync across
 * every client via Supabase Realtime.
 *
 *  - On mount: read (or create) the room row, then subscribe to row changes.
 *  - Mutations apply a pure reducer to the latest state and write it back; the
 *    realtime echo updates everyone. Turn-based play means writes are largely
 *    serialized, so races are rare.
 *  - `join` does a fresh DB read first so concurrent joins don't clobber each
 *    other (read-modify-write).
 *  - A presence channel reports how many clients are connected.
 */
export function useRoom(code: string): UseRoom {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(1);
  const [clientId, setClientId] = useState("");
  const [savedName, setSavedName] = useState("");

  const stateRef = useRef<GameState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured. See README setup.");
      setLoading(false);
      return;
    }

    const id = getClientId();
    setClientId(id);
    setSavedName(localStorage.getItem(NAME_KEY) ?? "");

    let cancelled = false;

    async function init() {
      const { data, error: selErr } = await supabase!
        .from(ROOMS_TABLE)
        .select("state")
        .eq("id", code)
        .maybeSingle();

      if (cancelled) return;
      if (selErr) {
        setError(selErr.message);
        setLoading(false);
        return;
      }

      if (data?.state) {
        setState(data.state as GameState);
      } else {
        // Create the room with an empty lobby.
        const fresh = initialState();
        const { error: insErr } = await supabase!
          .from(ROOMS_TABLE)
          .insert({ id: code, state: fresh });
        if (cancelled) return;
        if (insErr) {
          // Race: someone created it first — re-read.
          const { data: again } = await supabase!
            .from(ROOMS_TABLE)
            .select("state")
            .eq("id", code)
            .maybeSingle();
          if (again?.state && !cancelled) setState(again.state as GameState);
        } else {
          setState(fresh);
        }
      }
      if (!cancelled) setLoading(false);
    }

    init();

    const channel = supabase
      .channel(`room:${code}`, { config: { presence: { key: id } } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: ROOMS_TABLE, filter: `id=eq.${code}` },
        (payload) => {
          const row = payload.new as RoomRow | undefined;
          if (row?.state) setState(row.state);
        }
      )
      .on("presence", { event: "sync" }, () => {
        setOnline(Object.keys(channel.presenceState()).length || 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ at: Date.now() });
      });

    return () => {
      cancelled = true;
      supabase!.removeChannel(channel);
    };
  }, [code]);

  /** Apply a reducer to the latest state and persist it. */
  const apply = useCallback(
    async (reducer: (s: GameState) => GameState) => {
      if (!supabase) return;
      const base = stateRef.current ?? initialState();
      const next = reducer(base);
      if (next === base) return; // reducer no-op (e.g. not your turn)
      setState(next); // optimistic
      const { error: upErr } = await supabase
        .from(ROOMS_TABLE)
        .update({ state: next, updated_at: new Date().toISOString() })
        .eq("id", code);
      if (upErr) setError(upErr.message);
    },
    [code]
  );

  const join = useCallback(
    async (name: string) => {
      if (!supabase) return;
      const trimmed = name.trim().slice(0, 16) || "Player";
      localStorage.setItem(NAME_KEY, trimmed);
      setSavedName(trimmed);
      const id = getClientId();

      // Fresh read so simultaneous joins don't overwrite each other.
      const { data } = await supabase
        .from(ROOMS_TABLE)
        .select("state")
        .eq("id", code)
        .maybeSingle();
      const base = (data?.state as GameState) ?? stateRef.current ?? initialState();
      const next = addPlayer(base, id, trimmed);
      setState(next);
      const { error: upErr } = await supabase
        .from(ROOMS_TABLE)
        .upsert({ id: code, state: next, updated_at: new Date().toISOString() });
      if (upErr) setError(upErr.message);
    },
    [code]
  );

  const start = useCallback(() => apply(startGame), [apply]);
  const call = useCallback(
    (value: number) => apply((s) => callNumber(s, value, getClientId())),
    [apply]
  );
  const skip = useCallback(() => apply(skipTurn), [apply]);
  const playAgain = useCallback(() => apply(startGame), [apply]);
  const backToLobby = useCallback(() => apply(resetToLobby), [apply]);

  const me = state?.players.find((p) => p.id === clientId) ?? null;
  const current = state ? currentPlayer(state) : null;
  const isMyTurn = Boolean(current && clientId && current.id === clientId);

  return {
    state,
    loading,
    error,
    clientId,
    me,
    isMyTurn,
    current,
    online,
    savedName,
    join,
    start,
    call,
    skip,
    playAgain,
    backToLobby,
  };
}
