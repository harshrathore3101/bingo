"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

import { useUnoRoom } from "@/hooks/useUnoRoom";
import JoinUno from "./JoinUno";
import UnoLobby from "./UnoLobby";
import UnoTable from "./UnoTable";
import UnoWinModal from "./UnoWinModal";

/**
 * Orchestrates an UNO room: name gate → lobby → game table → win modal,
 * all synced in real time via useUnoRoom. Mirrors the BINGO RoomGame shell
 * (sticky bar, presence, share/leave).
 */
export default function UnoRoom({ code }: { code: string }) {
  const r = useUnoRoom(code);
  const { room, loading, error, clientId, me, online, savedName, isHost, isMyTurn } = r;

  const [copied, setCopied] = useState(false);
  const celebrated = useRef(false);

  // Confetti for everyone when the round finishes.
  useEffect(() => {
    if (room?.phase === "finished" && !celebrated.current) {
      celebrated.current = true;
      fireConfetti();
    }
    if (room?.phase !== "finished") celebrated.current = false;
  }, [room?.phase]);

  const copyLink = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, []);

  // Fatal config error (no room could load).
  if (error && !room) {
    return (
      <Centered>
        <p className="text-yellow-300 text-center">⚠ {error}</p>
        <Link href="/uno" className="mt-4 text-neon-blue underline">
          Back
        </Link>
      </Centered>
    );
  }

  if (loading || !room) {
    return (
      <Centered>
        <Spinner />
        <p className="mt-4 text-cyan-200/80">Joining UNO room {code}…</p>
        <Link href="/uno" className="mt-4 text-neon-blue underline text-sm">
          Leave
        </Link>
      </Centered>
    );
  }

  const locked = room.phase !== "waiting";

  return (
    <div className="relative min-h-screen">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-40 w-full bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="text-cyan-200/80">
            UNO Room{" "}
            <span className="text-yellow-400 font-bold tracking-widest">{code}</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              {online} online
            </span>
            <button onClick={copyLink} className="text-yellow-400 hover:underline">
              {copied ? "Copied!" : "Share"}
            </button>
            <Link href="/uno" className="text-white/70 hover:text-white">
              Leave
            </Link>
          </div>
        </div>
      </header>

      {/* Transient action error (e.g. illegal move) */}
      <AnimatePresence>
        {error && room && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 glass rounded-full px-4 py-2 text-sm text-red-300 border border-red-400/40"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative overflow-hidden flex flex-col items-center gap-6 px-4 pb-12 pt-6">
        <Blobs />

        {!me ? (
          <JoinUno
            code={code}
            defaultName={savedName}
            playerCount={room.members.length}
            locked={locked}
            onJoin={r.join}
          />
        ) : room.phase === "waiting" ? (
          <UnoLobby
            room={room}
            meId={clientId}
            isHost={isHost}
            code={code}
            onReady={r.ready}
            onSettings={r.updateSettings}
            onStart={r.start}
          />
        ) : room.game ? (
          <UnoTable
            game={room.game}
            meId={clientId}
            isMyTurn={isMyTurn}
            onPlay={r.play}
            onDraw={r.draw}
            onPass={r.passTurn}
            onUno={r.sayUno}
            onCatch={r.catchPlayer}
            onChallenge={r.challenge}
          />
        ) : null}
      </main>

      <UnoWinModal
        open={room.phase === "finished"}
        game={room.game}
        meId={clientId}
        isHost={isHost}
        onPlayAgain={r.again}
        onLobby={r.toLobby}
      />
    </div>
  );
}

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
      className="h-10 w-10 rounded-full border-4 border-yellow-400/30 border-t-yellow-400"
    />
  );
}

function Blobs() {
  return (
    <>
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-red-500/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-float [animation-delay:2s]" />
    </>
  );
}

function fireConfetti() {
  const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];
  const end = Date.now() + 1500;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.9 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.9 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
