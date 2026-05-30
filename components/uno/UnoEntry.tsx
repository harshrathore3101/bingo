"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isSupabaseConfigured } from "@/lib/supabase";

/** UNO landing: enter or create a room code, then navigate into the room. */
export default function UnoEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const sanitize = (v: string) => v.replace(/\D/g, "").slice(0, 6);
  const join = () => {
    const clean = sanitize(code);
    if (clean) router.push(`/uno/${clean}`);
  };
  const createRandom = () => router.push(`/uno/${Math.floor(1000 + Math.random() * 9000)}`);

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-red-500/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-float [animation-delay:2s]" />

      <Link href="/" className="absolute top-5 left-5 text-white/50 hover:text-white text-sm">
        ← Games
      </Link>

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-6xl sm:text-8xl font-extrabold"
        style={{
          background: "linear-gradient(90deg, #ef4444, #3b82f6, #22c55e, #f59e0b)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        UNO
      </motion.h1>
      <p className="text-cyan-200/80 text-center max-w-sm -mt-2">
        Real-time multiplayer UNO. Enter a room code to play with friends — full
        official rules, turn by turn.
      </p>

      {!isSupabaseConfigured && (
        <div className="glass rounded-xl px-5 py-3 max-w-sm text-center text-yellow-300 text-sm border-yellow-400/40">
          ⚠ Realtime backend not configured — add your Supabase keys (see README).
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
      >
        <label className="text-sm text-cyan-200/80 uppercase tracking-wider">Room code</label>
        <input
          value={code}
          onChange={(e) => setCode(sanitize(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && join()}
          inputMode="numeric"
          placeholder="e.g. 1234"
          className="bg-black/40 border-2 border-yellow-400/50 focus:border-yellow-400 rounded-xl px-4 py-3 text-2xl text-center tracking-[0.3em] text-yellow-400 outline-none transition-colors"
        />
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={join}
          disabled={!code}
          className="px-5 py-3 rounded-xl border-2 border-green-400 text-green-400 font-bold uppercase tracking-wider hover:bg-green-400/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Join Room
        </motion.button>

        <div className="flex items-center gap-3 text-white/30 text-xs">
          <span className="h-px flex-1 bg-white/15" /> OR <span className="h-px flex-1 bg-white/15" />
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={createRandom}
          className="px-5 py-3 rounded-xl border-2 border-red-400 text-red-400 font-bold uppercase tracking-wider hover:bg-red-400/20 transition-all"
        >
          ✦ Create New Room
        </motion.button>
      </motion.div>
    </main>
  );
}
