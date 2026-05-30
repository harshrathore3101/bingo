"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isSupabaseConfigured } from "@/lib/supabase";

/**
 * Landing screen: pick or create a room number, then navigate into the room.
 * Players who enter the SAME number share one synced board.
 */
export default function Lobby() {
  const router = useRouter();
  const [code, setCode] = useState("");

  // Only digits, max 6 — keeps room codes simple and shareable.
  const sanitize = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  const join = () => {
    const clean = sanitize(code);
    if (clean.length >= 1) router.push(`/room/${clean}`);
  };

  // Random 4-digit room for "create a new room".
  const createRandom = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    router.push(`/room/${random}`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center gap-8 px-4 py-10">
      {/* Floating neon background blobs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-neon-purple/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-neon-blue/20 blur-3xl animate-float [animation-delay:2s]" />

      <Link
        href="/"
        className="absolute top-5 left-5 text-white/50 hover:text-white text-sm"
      >
        ← Games
      </Link>

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl sm:text-7xl font-extrabold text-neon-pink animate-glow"
        style={{ color: "#ff2d95" }}
      >
        NEON BINGO
      </motion.h1>
      <p className="text-cyan-200/80 text-center max-w-sm -mt-4">
        Enter a room number to play together. Everyone in the same room shares one
        board — cross a number and it crosses on every screen, live.
      </p>

      {/* Setup warning if env vars are missing */}
      {!isSupabaseConfigured && (
        <div className="glass rounded-xl px-5 py-3 max-w-sm text-center text-yellow-300 text-sm border-yellow-400/40">
          ⚠ Realtime backend not configured. Add your Supabase keys (see README)
          to enable multiplayer rooms.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
      >
        <label className="text-sm text-cyan-200/80 uppercase tracking-wider">
          Room number
        </label>
        <input
          value={code}
          onChange={(e) => setCode(sanitize(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && join()}
          inputMode="numeric"
          placeholder="e.g. 1234"
          className="bg-black/40 border-2 border-neon-blue/50 focus:border-neon-blue rounded-xl px-4 py-3 text-2xl text-center tracking-[0.3em] text-neon-blue outline-none transition-colors"
        />

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={join}
          disabled={code.length < 1}
          className="px-5 py-3 rounded-xl border-2 border-neon-green text-neon-green font-bold uppercase tracking-wider hover:bg-neon-green/20 hover:shadow-neon-green transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Join Room
        </motion.button>

        <div className="flex items-center gap-3 text-white/30 text-xs">
          <span className="h-px flex-1 bg-white/15" /> OR{" "}
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={createRandom}
          className="px-5 py-3 rounded-xl border-2 border-neon-pink text-neon-pink font-bold uppercase tracking-wider hover:bg-neon-pink/20 hover:shadow-neon-pink transition-all"
        >
          ✦ Create New Room
        </motion.button>
      </motion.div>
    </main>
  );
}
