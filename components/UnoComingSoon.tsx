"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// Build phases for the full multiplayer UNO game, shown on the placeholder so
// progress is transparent. Updated as each phase lands.
const ROADMAP: Array<{ phase: string; items: string; status: "done" | "next" | "planned" }> = [
  { phase: "1 · Rules engine", items: "108-card deck, deal, play/draw rules, action/wild cards, challenge, scoring", status: "done" },
  { phase: "2 · Realtime room", items: "Supabase-synced game state, turns, reconnect", status: "next" },
  { phase: "3 · Game table UI", items: "Hand fan, draw/discard piles, players, color picker", status: "planned" },
  { phase: "4 · House rules", items: "Stacking & 7-0 (engine done), jump-in, turn timer", status: "planned" },
  { phase: "5 · Polish", items: "Animations, sound, spectator, stats, auth, tests", status: "planned" },
];

const UNO_COLORS = ["#ff4136", "#0074d9", "#2ecc40", "#ffdc00"];

/**
 * Placeholder for the UNO game while it's being built incrementally.
 * Keeps the landing-page flow working and shows the build roadmap.
 */
export default function UnoComingSoon() {
  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-red-500/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-yellow-400/20 blur-3xl animate-float [animation-delay:2s]" />

      <Link href="/" className="absolute top-5 left-5 text-white/50 hover:text-white text-sm">
        ← Games
      </Link>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-6xl mb-3">🃏</div>
        <h1
          className="text-5xl sm:text-7xl font-extrabold"
          style={{
            background: `linear-gradient(90deg, ${UNO_COLORS.join(", ")})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          UNO
        </h1>
        <p className="text-cyan-200/80 mt-3 max-w-md">
          Full multiplayer UNO is in active development — built phase by phase so
          every rule is correct and the game is genuinely playable.
        </p>
      </motion.div>

      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-sm uppercase tracking-wider text-cyan-200/70 mb-4">
          Build roadmap
        </h3>
        <ul className="flex flex-col gap-3">
          {ROADMAP.map((r) => (
            <li key={r.phase} className="flex items-start gap-3">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  r.status === "done"
                    ? "bg-neon-green"
                    : r.status === "next"
                      ? "bg-neon-yellow animate-pulse"
                      : "bg-white/20"
                }`}
                style={r.status === "next" ? { background: "#fdfd00" } : undefined}
              />
              <div>
                <p className="font-semibold text-white">
                  {r.phase}
                  {r.status === "done" && (
                    <span className="ml-2 text-[10px] text-neon-green">✓ DONE</span>
                  )}
                  {r.status === "next" && (
                    <span className="ml-2 text-[10px]" style={{ color: "#fdfd00" }}>
                      IN PROGRESS
                    </span>
                  )}
                </p>
                <p className="text-cyan-100/60 text-sm">{r.items}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/bingo"
        className="text-neon-blue hover:underline text-sm"
      >
        Play BINGO while you wait →
      </Link>
    </main>
  );
}
