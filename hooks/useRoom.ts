"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured, ROOMS_TABLE, RoomRow } from "@/lib/supabase";
import { Cell, generateBoard } from "@/lib/bingo";

export interface UseRoom {
  cells: Cell[] | null;
  started: boolean;
  loading: boolean;
  error: string | null;
  /** Number of players currently connected to this room (via presence). */
  players: number;
  toggle: (index: number) => void;
  start: () => void;
  generate: () => void;
  restart: () => void;
}

/**
 * Connects to a single room and keeps its board in sync across every client.
 *
 * How it works:
 *  1. On mount we read the room row from the `rooms` table (creating it with a
 *     fresh board if it doesn't exist yet).
 *  2. We subscribe to Postgres change events for that row — whenever ANY player
 *     updates the board, Supabase Realtime pushes the new row to everyone, so
 *     each client re-renders with the shared state.
 *  3. Local actions (toggle/start/generate/restart) update state optimistically
 *     and write the full board back to the row; the realtime echo keeps all
 *     other clients in sync.
 *  4. A presence channel tracks how many players are connected.
 */
export function useRoom(code: string): UseRoom {
  const [cells, setCells] = useState<Cell[] | null>(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState(1);

  // Refs hold the latest values so action callbacks (created once) never read
  // stale state when building the next board to persist.
  const cellsRef = useRef<Cell[] | null>(null);
  const startedRef = useRef(false);
  cellsRef.current = cells;
  startedRef.current = started;

  /** Apply a row received from the database / realtime to local state. */
  const applyRow = useCallback((row: Pick<RoomRow, "cells" | "started">) => {
    setCells(row.cells);
    setStarted(row.started);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured. See README setup.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    // --- Step 1 & 2: load (or create) the room, then subscribe ----------
    async function init() {
      const { data, error: selErr } = await supabase!
        .from(ROOMS_TABLE)
        .select("cells, started")
        .eq("id", code)
        .maybeSingle();

      if (cancelled) return;
      if (selErr) {
        setError(selErr.message);
        setLoading(false);
        return;
      }

      if (data) {
        applyRow(data as RoomRow);
      } else {
        // Room doesn't exist — create it with a fresh board.
        const fresh = generateBoard();
        const { error: insErr } = await supabase!
          .from(ROOMS_TABLE)
          .insert({ id: code, cells: fresh, started: false });

        if (cancelled) return;
        if (insErr) {
          // Likely a race: another player created it first. Re-read.
          const { data: again } = await supabase!
            .from(ROOMS_TABLE)
            .select("cells, started")
            .eq("id", code)
            .maybeSingle();
          if (again && !cancelled) applyRow(again as RoomRow);
        } else {
          applyRow({ cells: fresh, started: false });
        }
      }
      if (!cancelled) setLoading(false);
    }

    init();

    // Realtime: listen for board updates + track presence (player count).
    const channel = supabase
      .channel(`room:${code}`, {
        config: { presence: { key: Math.random().toString(36).slice(2) } },
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: ROOMS_TABLE, filter: `id=eq.${code}` },
        (payload) => {
          const row = payload.new as RoomRow | undefined;
          if (row?.cells) applyRow(row);
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setPlayers(Object.keys(state).length || 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      cancelled = true;
      supabase!.removeChannel(channel);
    };
  }, [code, applyRow]);

  /** Write the full board (and started flag) back to the room row. */
  const persist = useCallback(
    async (nextCells: Cell[], nextStarted: boolean) => {
      // Optimistic local update for instant feedback.
      setCells(nextCells);
      setStarted(nextStarted);
      if (!supabase) return;
      const { error: upErr } = await supabase
        .from(ROOMS_TABLE)
        .update({
          cells: nextCells,
          started: nextStarted,
          updated_at: new Date().toISOString(),
        })
        .eq("id", code);
      if (upErr) setError(upErr.message);
    },
    [code]
  );

  // --- Actions (stable identities; read latest state via refs) ----------
  const toggle = useCallback(
    (index: number) => {
      const current = cellsRef.current;
      if (!current) return;
      const cell = current[index];
      if (cell.isFree) return; // FREE space (if enabled) isn't toggleable
      const next = current.map((c, i) =>
        i === index ? { ...c, marked: !c.marked } : c
      );
      persist(next, startedRef.current);
    },
    [persist]
  );

  const start = useCallback(() => {
    if (cellsRef.current) persist(cellsRef.current, true);
  }, [persist]);

  // New board for everyone in the room; keeps the game running.
  const generate = useCallback(() => {
    persist(generateBoard(), startedRef.current);
  }, [persist]);

  // Full reset for the whole room: new board, back to pre-start.
  const restart = useCallback(() => {
    persist(generateBoard(), false);
  }, [persist]);

  return { cells, started, loading, error, players, toggle, start, generate, restart };
}
