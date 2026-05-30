"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  supabase,
  isSupabaseConfigured,
  UNO_ROOMS_TABLE,
  UnoRoomRow,
} from "@/lib/supabase";
import {
  UnoRoom,
  UnoMember,
  initialUnoRoom,
  addMember,
  setReady,
  setSettings,
  startUno,
  backToLobby,
  syncPhase,
  normalizeUnoRoom,
} from "@/lib/unoRoom";
import {
  UnoState,
  UnoSettings,
  UnoColor,
  ActionResult,
  playCard,
  drawCard,
  pass,
  callUno,
  catchUno,
  challengeDrawFour,
  currentPlayerId,
} from "@/lib/uno";

const CLIENT_ID_KEY = "bingo-client-id"; // shared identity across games
const NAME_KEY = "bingo-player-name";

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

export interface UseUnoRoom {
  room: UnoRoom | null;
  loading: boolean;
  error: string | null;
  clientId: string;
  me: UnoMember | null;
  online: number;
  savedName: string;
  isHost: boolean;
  isMyTurn: boolean;
  join: (name: string) => Promise<void>;
  ready: (ready: boolean) => void;
  updateSettings: (s: Partial<UnoSettings>) => void;
  start: () => void;
  play: (cardId: string, opts?: { chosenColor?: UnoColor; targetId?: string }) => void;
  draw: () => void;
  passTurn: () => void;
  sayUno: () => void;
  catchPlayer: (targetId: string) => void;
  challenge: () => void;
  again: () => void;
  toLobby: () => void;
}

/**
 * Realtime UNO room synced through the `uno_rooms` table. Mirrors useRoom:
 * load/create the row, subscribe to changes, presence for the online count,
 * and pure-reducer actions that persist the whole room state.
 */
export function useUnoRoom(code: string): UseUnoRoom {
  const [room, setRoom] = useState<UnoRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(1);
  const [clientId, setClientId] = useState("");
  const [savedName, setSavedName] = useState("");

  const roomRef = useRef<UnoRoom | null>(null);
  roomRef.current = room;

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
        .from(UNO_ROOMS_TABLE)
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
        setRoom(normalizeUnoRoom(data.state));
      } else {
        const fresh = initialUnoRoom();
        const { error: insErr } = await supabase!
          .from(UNO_ROOMS_TABLE)
          .insert({ id: code, state: fresh });
        if (cancelled) return;
        if (insErr) {
          const { data: again } = await supabase!
            .from(UNO_ROOMS_TABLE)
            .select("state")
            .eq("id", code)
            .maybeSingle();
          if (again?.state && !cancelled) setRoom(normalizeUnoRoom(again.state));
        } else {
          setRoom(fresh);
        }
      }
      if (!cancelled) setLoading(false);
    }
    init();

    const channel = supabase
      .channel(`uno:${code}`, { config: { presence: { key: id } } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: UNO_ROOMS_TABLE, filter: `id=eq.${code}` },
        (payload) => {
          const row = payload.new as UnoRoomRow | undefined;
          if (row?.state) setRoom(normalizeUnoRoom(row.state));
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

  /** Apply a pure room reducer and persist. */
  const apply = useCallback(
    async (reducer: (r: UnoRoom) => UnoRoom) => {
      if (!supabase) return;
      const base = roomRef.current ?? initialUnoRoom();
      const next = syncPhase(reducer(base));
      if (next === base) return;
      setRoom(next);
      const { error: upErr } = await supabase
        .from(UNO_ROOMS_TABLE)
        .update({ state: next, updated_at: new Date().toISOString() })
        .eq("id", code);
      if (upErr) setError(upErr.message);
    },
    [code]
  );

  /** Apply an engine action to room.game, surfacing validation errors. */
  const applyGame = useCallback(
    (fn: (g: UnoState) => ActionResult) => {
      const base = roomRef.current;
      if (!base?.game) return;
      const res = fn(base.game);
      if (!res.ok) {
        setError(res.error ?? "Invalid move");
        setTimeout(() => setError(null), 1800);
        return;
      }
      apply((r) => (r.game ? { ...r, game: res.state } : r));
    },
    [apply]
  );

  const join = useCallback(
    async (name: string) => {
      if (!supabase) return;
      const trimmed = name.trim().slice(0, 16) || "Player";
      localStorage.setItem(NAME_KEY, trimmed);
      setSavedName(trimmed);
      const id = getClientId();
      const { data } = await supabase
        .from(UNO_ROOMS_TABLE)
        .select("state")
        .eq("id", code)
        .maybeSingle();
      const base = data?.state ? normalizeUnoRoom(data.state) : roomRef.current ?? initialUnoRoom();
      const next = addMember(base, id, trimmed);
      setRoom(next);
      const { error: upErr } = await supabase
        .from(UNO_ROOMS_TABLE)
        .upsert({ id: code, state: next, updated_at: new Date().toISOString() });
      if (upErr) setError(upErr.message);
    },
    [code]
  );

  const ready = useCallback((r: boolean) => apply((room) => setReady(room, getClientId(), r)), [apply]);
  const updateSettings = useCallback((s: Partial<UnoSettings>) => apply((room) => setSettings(room, s)), [apply]);
  const start = useCallback(() => apply((room) => startUno(room)), [apply]);
  const again = useCallback(() => apply((room) => startUno(backToLobby(room))), [apply]);
  const toLobby = useCallback(() => apply((room) => backToLobby(room)), [apply]);

  const play = useCallback(
    (cardId: string, opts?: { chosenColor?: UnoColor; targetId?: string }) =>
      applyGame((g) => playCard(g, getClientId(), cardId, opts)),
    [applyGame]
  );
  const draw = useCallback(() => applyGame((g) => drawCard(g, getClientId())), [applyGame]);
  const passTurn = useCallback(() => applyGame((g) => pass(g, getClientId())), [applyGame]);
  const sayUno = useCallback(() => applyGame((g) => callUno(g, getClientId())), [applyGame]);
  const catchPlayer = useCallback((targetId: string) => applyGame((g) => catchUno(g, targetId)), [applyGame]);
  const challenge = useCallback(() => applyGame((g) => challengeDrawFour(g, getClientId())), [applyGame]);

  const me = room?.members.find((m) => m.id === clientId) ?? null;
  const isHost = Boolean(room && clientId && room.hostId === clientId);
  const isMyTurn = Boolean(
    room?.game && clientId && currentPlayerId(room.game) === clientId
  );

  return {
    room,
    loading,
    error,
    clientId,
    me,
    online,
    savedName,
    isHost,
    isMyTurn,
    join,
    ready,
    updateSettings,
    start,
    play,
    draw,
    passTurn,
    sayUno,
    catchPlayer,
    challenge,
    again,
    toLobby,
  };
}
