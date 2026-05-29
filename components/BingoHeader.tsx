"use client";

import { motion } from "framer-motion";
import { BINGO_LETTERS } from "@/lib/bingo";

interface BingoHeaderProps {
  /** How many BINGO letters have been earned so far (0-5). */
  earned: number;
}

// Each letter gets its own neon color so completed letters pop individually.
const LETTER_COLORS = [
  "#ff2d95", // B - pink
  "#00d4ff", // I - blue
  "#39ff14", // N - green
  "#fdfd00", // G - yellow
  "#9d4edd", // O - purple
];

/**
 * Displays the big "B I N G O" title at the top.
 * Letters that have been earned light up with a glowing, animated state;
 * un-earned letters stay dim.
 */
export default function BingoHeader({ earned }: BingoHeaderProps) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {BINGO_LETTERS.map((letter, i) => {
        const active = i < earned;
        const color = LETTER_COLORS[i];
        return (
          <motion.span
            key={letter}
            initial={false}
            // Pop + glow when a letter becomes active
            animate={{
              scale: active ? [1, 1.35, 1] : 1,
              color: active ? color : "#3a3a55",
            }}
            transition={{ duration: 0.5 }}
            className={`text-5xl sm:text-7xl font-extrabold select-none ${
              active ? "animate-glow" : ""
            }`}
            style={active ? { color, textShadow: `0 0 20px ${color}` } : undefined}
          >
            {letter}
          </motion.span>
        );
      })}
    </div>
  );
}
