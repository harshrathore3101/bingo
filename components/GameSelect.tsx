"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface GameDef {
  href: string;
  title: string;
  tag: string;
  tagColor: string;
  desc: string;
  emoji: string;
  colors: string[]; // accent gradient stops
  disabled?: boolean;
}

// The games available from the landing page. BINGO is live; UNO is in active
// development (the route exists so the flow works end-to-end).
const GAMES: GameDef[] = [
  {
    href: "/bingo",
    title: "BINGO",
    tag: "LIVE",
    tagColor: "#39ff14",
    desc: "Turn-based multiplayer Bingo with rooms, chat & a BingoBot.",
    emoji: "🎲",
    colors: ["#ff2d95", "#00d4ff", "#9d4edd"],
  },
  {
    href: "/uno",
    title: "UNO",
    tag: "BETA",
    tagColor: "#ffdc00",
    desc: "Classic UNO — full rules & real-time multiplayer (in development).",
    emoji: "🃏",
    colors: ["#ff4136", "#0074d9", "#2ecc40", "#ffdc00"],
  },
];

/**
 * Landing page: choose which game to play. Each game is a glowing card that
 * routes to that game's own lobby.
 */
export default function GameSelect() {
  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center gap-10 px-4 py-12">
      {/* Floating neon background blobs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-neon-purple/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-neon-blue/20 blur-3xl animate-float [animation-delay:2s]" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1
          className="text-5xl sm:text-7xl font-extrabold text-neon-pink animate-glow"
          style={{ color: "#ff2d95" }}
        >
          GAME ARCADE
        </h1>
        <p className="text-cyan-200/80 mt-3">Pick a game to play with friends</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {GAMES.map((g, i) => (
          <GameCard key={g.title} game={g} index={i} />
        ))}
      </div>
    </main>
  );
}

function GameCard({ game, index }: { game: GameDef; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={game.href} className="block">
        <motion.div
          whileHover={{ scale: 1.04, y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="glass relative rounded-3xl p-6 h-full overflow-hidden cursor-pointer border border-white/10"
        >
          {/* Accent gradient stripe */}
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{
              background: `linear-gradient(90deg, ${game.colors.join(", ")})`,
            }}
          />

          {/* Tag */}
          <span
            className="absolute top-4 right-4 text-[10px] font-bold tracking-widest px-2 py-1 rounded-full"
            style={{ color: game.tagColor, border: `1px solid ${game.tagColor}66` }}
          >
            {game.tag}
          </span>

          <div className="text-5xl mb-4">{game.emoji}</div>
          <h2 className="text-3xl font-extrabold text-white">{game.title}</h2>
          <p className="text-cyan-100/70 text-sm mt-2">{game.desc}</p>

          <span className="inline-block mt-5 text-sm font-semibold text-neon-blue">
            Play →
          </span>
        </motion.div>
      </Link>
    </motion.div>
  );
}
