"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";

import BingoHeader from "@/components/BingoHeader";
import BingoBoard from "@/components/BingoBoard";
import Controls from "@/components/Controls";
import WinModal from "@/components/WinModal";
import {
  Cell,
  generateBoard,
  detectCompletedLines,
  lettersEarned,
  hasWon,
  highlightedCells,
} from "@/lib/bingo";

// Shape of the data we persist to localStorage so a refresh keeps progress.
interface SavedState {
  cells: Cell[];
  started: boolean;
}

const STORAGE_KEY = "neon-bingo-state";

export default function Home() {
  // --- Core game state -----------------------------------------------------
  const [cells, setCells] = useState<Cell[]>(() => generateBoard());
  const [started, setStarted] = useState(false);
  // Tracks whether we've finished reading from localStorage, so we don't
  // overwrite saved data with the initial render's default board.
  const [hydrated, setHydrated] = useState(false);

  // Prevent firing confetti more than once per win.
  const celebratedRef = useRef(false);

  // --- Derived state (recomputed from `cells`) -----------------------------
  // Completed lines, letters earned, win status and winning-cell highlights
  // are all pure functions of the board, so we derive them with useMemo
  // instead of storing duplicated state (single source of truth).
  const completedLineIndices = useMemo(() => detectCompletedLines(cells), [cells]);
  const earned = lettersEarned(completedLineIndices.length);
  const won = hasWon(completedLineIndices.length);
  const winningCells = useMemo(
    () => highlightedCells(completedLineIndices),
    [completedLineIndices]
  );

  // --- localStorage: load once on mount ------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: SavedState = JSON.parse(raw);
        if (Array.isArray(saved.cells) && saved.cells.length === 25) {
          setCells(saved.cells);
          setStarted(saved.started);
        }
      }
    } catch {
      // Corrupt/unavailable storage — silently fall back to the fresh board.
    }
    setHydrated(true);
  }, []);

  // --- localStorage: save whenever state changes (after hydration) ---------
  useEffect(() => {
    if (!hydrated) return;
    try {
      const toSave: SavedState = { cells, started };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Ignore quota / privacy-mode errors.
    }
  }, [cells, started, hydrated]);

  // --- Win side effect: confetti -------------------------------------------
  useEffect(() => {
    if (won && !celebratedRef.current) {
      celebratedRef.current = true;
      fireConfetti();
    }
    if (!won) {
      // Reset the guard once we're no longer in a winning state (new game).
      celebratedRef.current = false;
    }
  }, [won]);

  // --- Handlers ------------------------------------------------------------
  /** Toggle a numbered cell's marked state (ignored if not interactive). */
  const handleToggle = useCallback(
    (index: number) => {
      if (!started || won) return;
      setCells((prev) => {
        const cell = prev[index];
        if (cell.isFree) return prev; // FREE space can't be toggled
        const next = [...prev];
        next[index] = { ...cell, marked: !cell.marked };
        return next;
      });
    },
    [started, won]
  );

  const handleStart = useCallback(() => setStarted(true), []);

  /** Generate a brand-new random board (keeps the game in its started state). */
  const handleGenerate = useCallback(() => {
    celebratedRef.current = false;
    setCells(generateBoard());
  }, []);

  /** Full reset: new board, back to the pre-start screen. */
  const handleRestart = useCallback(() => {
    celebratedRef.current = false;
    setCells(generateBoard());
    setStarted(false);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center gap-8 px-4 py-10">
      {/* Decorative floating neon blobs in the background */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-neon-purple/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-neon-blue/20 blur-3xl animate-float [animation-delay:2s]" />

      <BingoHeader earned={earned} />

      <BingoBoard
        cells={cells}
        winningCells={winningCells}
        interactive={started && !won}
        onToggle={handleToggle}
      />

      <Controls
        started={started}
        won={won}
        completedLines={completedLineIndices.length}
        onStart={handleStart}
        onGenerate={handleGenerate}
        onRestart={handleRestart}
      />

      {/* Hint shown before the game starts */}
      {!started && (
        <p className="text-cyan-200/70 text-sm text-center max-w-xs">
          Press <span className="text-neon-green font-semibold">Start Game</span>,
          then tap cells to mark them. Complete 5 lines to spell BINGO and win!
        </p>
      )}

      <WinModal open={won} onPlayAgain={handleRestart} />
    </main>
  );
}

/** Fire a celebratory confetti burst from both bottom corners. */
function fireConfetti() {
  const colors = ["#ff2d95", "#00d4ff", "#39ff14", "#fdfd00", "#9d4edd"];
  const end = Date.now() + 1200;

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.9 },
      colors,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.9 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
