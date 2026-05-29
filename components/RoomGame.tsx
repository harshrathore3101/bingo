"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

import BingoHeader from "./BingoHeader";
import BingoBoard, { CallerInfo } from "./BingoBoard";
import WinModal from "./WinModal";
import JoinRoom from "./JoinRoom";
import PlayerList from "./PlayerList";
import CalledLog from "./CalledLog";
import TurnBanner from "./TurnBanner";

import { useRoom } from "@/hooks/useRoom";
import { calledSet, leaderboard } from "@/lib/game";
import {
  cellsFromCard,
  detectCompletedLines,
  lettersEarned,
  highlightedCells,
} from "@/lib/bingo";
import { playerColor, initial } from "@/lib/colors";

/**
 * Orchestrates a classic turn-based Bingo room:
 *  - gate on a name (JoinRoom) until the player has joined
 *  - lobby → players join, anyone can Start
 *  - playing → the current player taps a number on THEIR card to "call" it;
 *    it marks on everyone's card; turn rotates
 *  - finished → winner shown to all + confetti + leaderboard
 */
export default function RoomGame({ code }: { code: string }) {
  const room = useRoom(code);
  const {
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
    playAgain,
    backToLobby,
  } = room;

  const [copied, setCopied] = useState(false);
  const celebratedRef = useRef(false);

  // Fire confetti once on every client when the game reaches "finished".
  useEffect(() => {
    if (state?.phase === "finished" && !celebratedRef.current) {
      celebratedRef.current = true;
      fireConfetti();
    }
    if (state?.phase !== "finished") celebratedRef.current = false;
  }, [state?.phase]);

  const copyLink = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, []);

  // --- Derived view state (only meaningful once joined) ------------------
  const called = useMemo(() => (state ? calledSet(state) : new Set<number>()), [state]);

  const callerByValue = useMemo(() => {
    const m = new Map<number, CallerInfo>();
    state?.called.forEach((c) =>
      m.set(c.value, { initial: initial(c.byName), color: playerColor(c.by) })
    );
    return m;
  }, [state?.called]);

  const myCells = useMemo(
    () => (me ? cellsFromCard(me.card, called) : []),
    [me, called]
  );
  const completedLines = useMemo(() => detectCompletedLines(myCells), [myCells]);
  const winningCells = useMemo(
    () => highlightedCells(completedLines),
    [completedLines]
  );
  const earned = lettersEarned(completedLines.length);
  const lastCalled = state?.called.at(-1)?.value ?? null;

  // --- Render states -------------------------------------------------------
  if (error) {
    return (
      <Centered>
        <p className="text-yellow-300 text-center">⚠ {error}</p>
        <Link href="/" className="mt-4 text-neon-blue underline">
          Back to lobby
        </Link>
      </Centered>
    );
  }

  if (loading || !state) {
    return (
      <Centered>
        <Spinner />
        <p className="mt-4 text-cyan-200/80">Joining room {code}…</p>
      </Centered>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center gap-5 px-4 py-8">
      <Blobs />

      {/* Room bar */}
      <div className="glass rounded-xl px-4 py-2 flex items-center gap-4 text-sm flex-wrap justify-center">
        <span className="text-cyan-200/80">
          Room <span className="text-neon-blue font-bold tracking-widest">{code}</span>
        </span>
        <span className="flex items-center gap-1 text-neon-green">
          <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
          {online} online
        </span>
        <button onClick={copyLink} className="text-neon-pink hover:underline">
          {copied ? "Copied!" : "Share"}
        </button>
        <Link href="/" className="text-white/50 hover:text-white">
          Leave
        </Link>
      </div>

      <BingoHeader earned={earned} />

      {/* Not joined yet → name gate */}
      {!me ? (
        <JoinRoom
          code={code}
          defaultName={savedName}
          playerCount={state.players.length}
          onJoin={join}
        />
      ) : (
        <>
          {/* Status / controls row */}
          {state.phase === "lobby" && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-cyan-200/80 text-center max-w-xs">
                Waiting in the lobby. Share room{" "}
                <span className="text-neon-blue font-semibold">{code}</span> with
                friends, then start when everyone's in.
              </p>
              <NeonBtn color="green" onClick={start}>
                ▶ Start Game
              </NeonBtn>
              {state.players.length < 2 && (
                <p className="text-white/40 text-xs">
                  Tip: you can play solo to test, but it's more fun with 2+.
                </p>
              )}
            </div>
          )}

          {state.phase === "playing" && (
            <TurnBanner current={current} isMyTurn={isMyTurn} />
          )}

          {/* Board + side panels */}
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-5 w-full max-w-4xl justify-center">
            <BingoBoard
              card={me.card}
              called={called}
              winningCells={winningCells}
              canCall={isMyTurn && state.phase === "playing"}
              callerByValue={callerByValue}
              lastCalled={lastCalled}
              onCall={call}
            />
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full lg:w-auto">
              <PlayerList state={state} meId={clientId} currentId={current?.id ?? null} />
              <CalledLog called={state.called} />
            </div>
          </div>
        </>
      )}

      <WinModal
        open={state.phase === "finished"}
        winnerName={state.winnerName}
        isMe={state.winnerId === clientId}
        leaderboard={leaderboard(state)}
        meId={clientId}
        onPlayAgain={playAgain}
        onLobby={backToLobby}
      />
    </main>
  );
}

// --- Small presentational helpers ------------------------------------------
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="glass rounded-2xl px-8 py-10 flex flex-col items-center">{children}</div>
    </main>
  );
}

function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="h-10 w-10 rounded-full border-4 border-neon-blue/30 border-t-neon-blue"
    />
  );
}

function Blobs() {
  return (
    <>
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-neon-purple/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-neon-blue/20 blur-3xl animate-float [animation-delay:2s]" />
    </>
  );
}

function NeonBtn({
  children,
  onClick,
  color,
}: {
  children: React.ReactNode;
  onClick: () => void;
  color: "green" | "pink" | "blue";
}) {
  const colors = {
    green: "border-neon-green text-neon-green hover:bg-neon-green/20 hover:shadow-neon-green",
    pink: "border-neon-pink text-neon-pink hover:bg-neon-pink/20 hover:shadow-neon-pink",
    blue: "border-neon-blue text-neon-blue hover:bg-neon-blue/20 hover:shadow-neon-blue",
  } as const;
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`px-6 py-3 rounded-xl border-2 font-bold uppercase tracking-wider transition-all ${colors[color]}`}
    >
      {children}
    </motion.button>
  );
}

/** Celebratory confetti from both bottom corners. */
function fireConfetti() {
  const colors = ["#ff2d95", "#00d4ff", "#39ff14", "#fdfd00", "#9d4edd"];
  const end = Date.now() + 1500;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.9 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.9 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
