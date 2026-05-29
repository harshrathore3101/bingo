"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

import BingoHeader from "./BingoHeader";
import BingoBoard from "./BingoBoard";
import Controls from "./Controls";
import WinModal from "./WinModal";
import { useRoom } from "@/hooks/useRoom";
import {
  detectCompletedLines,
  lettersEarned,
  hasWon,
  highlightedCells,
} from "@/lib/bingo";

/**
 * The in-room game. Board state is shared across everyone in the same room via
 * the useRoom() realtime hook — a cross by any player appears for all players.
 * Win detection / confetti are derived locally on each client from the shared
 * board, so everyone celebrates together.
 */
export default function RoomGame({ code }: { code: string }) {
  const { cells, started, loading, error, players, toggle, start, generate, restart } =
    useRoom(code);

  const [copied, setCopied] = useState(false);
  const celebratedRef = useRef(false);

  // Derived game state (same single-source-of-truth approach as before).
  const completedLineIndices = useMemo(
    () => (cells ? detectCompletedLines(cells) : []),
    [cells]
  );
  const earned = lettersEarned(completedLineIndices.length);
  const won = hasWon(completedLineIndices.length);
  const winningCells = useMemo(
    () => highlightedCells(completedLineIndices),
    [completedLineIndices]
  );

  // Fire confetti once when this client first sees the winning state.
  useEffect(() => {
    if (won && !celebratedRef.current) {
      celebratedRef.current = true;
      fireConfetti();
    }
    if (!won) celebratedRef.current = false;
  }, [won]);

  // Copy a shareable room link to invite other players.
  const copyLink = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, []);

  // --- Render states -------------------------------------------------------
  if (error) {
    return (
      <CenteredCard>
        <p className="text-yellow-300 text-center">⚠ {error}</p>
        <Link href="/" className="mt-4 text-neon-blue underline">
          Back to lobby
        </Link>
      </CenteredCard>
    );
  }

  if (loading || !cells) {
    return (
      <CenteredCard>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-4 border-neon-blue/30 border-t-neon-blue"
        />
        <p className="mt-4 text-cyan-200/80">Joining room {code}…</p>
      </CenteredCard>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-neon-purple/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-neon-blue/20 blur-3xl animate-float [animation-delay:2s]" />

      {/* Room bar: code, live player count, share + leave */}
      <div className="glass rounded-xl px-4 py-2 flex items-center gap-4 text-sm">
        <span className="text-cyan-200/80">
          Room <span className="text-neon-blue font-bold tracking-widest">{code}</span>
        </span>
        <span className="flex items-center gap-1 text-neon-green">
          <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
          {players} online
        </span>
        <button onClick={copyLink} className="text-neon-pink hover:underline">
          {copied ? "Copied!" : "Share"}
        </button>
        <Link href="/" className="text-white/50 hover:text-white">
          Leave
        </Link>
      </div>

      <BingoHeader earned={earned} />

      <BingoBoard
        cells={cells}
        winningCells={winningCells}
        interactive={started && !won}
        onToggle={toggle}
      />

      <Controls
        started={started}
        won={won}
        completedLines={completedLineIndices.length}
        onStart={start}
        onGenerate={generate}
        onRestart={restart}
      />

      {!started && (
        <p className="text-cyan-200/70 text-sm text-center max-w-xs">
          Share room <span className="text-neon-blue font-semibold">{code}</span>,
          then press <span className="text-neon-green font-semibold">Start Game</span>.
          Any player's cross syncs to everyone instantly.
        </p>
      )}

      <WinModal open={won} onPlayAgain={restart} />
    </main>
  );
}

/** Small helper for full-screen centered states (loading / error). */
function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="glass rounded-2xl px-8 py-10 flex flex-col items-center">
        {children}
      </div>
    </main>
  );
}

/** Celebratory confetti burst from both bottom corners. */
function fireConfetti() {
  const colors = ["#ff2d95", "#00d4ff", "#39ff14", "#fdfd00", "#9d4edd"];
  const end = Date.now() + 1200;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 65, origin: { x: 0, y: 0.9 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 65, origin: { x: 1, y: 0.9 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
