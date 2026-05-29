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
import TurnBanner from "./TurnBanner";
import ChatPanel from "./ChatPanel";

import { useRoom } from "@/hooks/useRoom";
import { useChat } from "@/hooks/useChat";
import { calledSet, leaderboard, callNumber } from "@/lib/game";
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

  // --- Chat + BingoBot ----------------------------------------------------
  // Stable author identity for the chat hook.
  const author = useMemo(
    () => (me ? { id: clientId, name: me.name } : null),
    [clientId, me?.name] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const chat = useChat(code, author);

  // The client that performs an action also posts the matching BingoBot
  // message — so game events appear exactly once (no cross-client duplicates).
  const handleJoin = useCallback(
    async (name: string) => {
      await join(name);
      chat.postBot(`${name} joined the room 👋`);
    },
    [join, chat]
  );

  const handleStart = useCallback(() => {
    start();
    chat.postBot(`🎮 ${me?.name ?? "Someone"} started the game — cards dealt!`);
  }, [start, chat, me?.name]);

  const handleCall = useCallback(
    (value: number) => {
      if (!state || !me) return;
      // Inspect the (pure) outcome locally to know what to announce.
      const next = callNumber(state, value, clientId);
      if (next === state) return; // not your turn / already called — no-op
      call(value);
      chat.postBot(`${me.name} called ${value}`);
      if (next.phase === "finished" && next.winnerName) {
        chat.postBot(`🏆 ${next.winnerName} wins — GG! 🎉`);
      }
    },
    [state, me, clientId, call, chat]
  );

  const handlePlayAgain = useCallback(() => {
    playAgain();
    chat.postBot(`🔄 New round! Good luck everyone.`);
  }, [playAgain, chat]);

  const handleLobby = useCallback(() => {
    backToLobby();
    chat.postBot(`↩️ Back to the lobby.`);
  }, [backToLobby, chat]);

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
        <Link href="/" className="mt-4 text-neon-blue underline text-sm">
          Leave
        </Link>
      </Centered>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Sticky top room bar — stays pinned at the top while you scroll */}
      <header className="sticky top-0 z-40 w-full bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="text-cyan-200/80">
            Room <span className="text-neon-blue font-bold tracking-widest">{code}</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-neon-green">
              <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
              {online} online
            </span>
            <button onClick={copyLink} className="text-neon-pink hover:underline">
              {copied ? "Copied!" : "Share"}
            </button>
            <Link href="/" className="text-white/70 hover:text-white">
              Leave
            </Link>
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden flex flex-col items-center gap-5 px-4 pb-10 pt-6">
        <Blobs />
        <BingoHeader earned={earned} />

      {/* Not joined yet → name gate (only from the lobby). Once the game has
          started the room is locked, so newcomers see a waiting screen until
          it returns to the lobby for the next round. */}
      {!me ? (
        state.phase === "lobby" ? (
          <JoinRoom
            code={code}
            defaultName={savedName}
            playerCount={state.players.length}
            onJoin={handleJoin}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-3 text-center"
          >
            <div className="text-4xl">🔒</div>
            <h2 className="text-xl font-bold text-neon-pink">Game in progress</h2>
            <p className="text-cyan-200/80 text-sm">
              This room has already started, so you can&apos;t join right now.
              Hang tight — you&apos;ll be able to join when the current round
              finishes and players return to the lobby.
            </p>
            <Link href="/" className="text-neon-blue underline text-sm mt-1">
              Pick another room
            </Link>
          </motion.div>
        )
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
              <NeonBtn color="green" onClick={handleStart}>
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
              onCall={handleCall}
            />
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full lg:w-auto">
              <PlayerList state={state} meId={clientId} currentId={current?.id ?? null} />
              <ChatPanel
                messages={chat.messages}
                meId={clientId}
                canChat={Boolean(me)}
                onSend={chat.send}
              />
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
        onPlayAgain={handlePlayAgain}
        onLobby={handleLobby}
      />
      </main>
    </div>
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
