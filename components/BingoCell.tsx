"use client";

import { motion } from "framer-motion";
import type { Cell } from "@/lib/bingo";

interface BingoCellProps {
  cell: Cell;
  /** Whether this cell is part of a completed (winning) line. */
  inWinningLine: boolean;
  /** Whether the board is currently interactive. */
  disabled: boolean;
  onClick: () => void;
}

/**
 * A single square on the Bingo board.
 * Handles its own hover / marked / winning-line visual states.
 * Purely presentational — all logic lives in the parent.
 */
export default function BingoCell({
  cell,
  inWinningLine,
  disabled,
  onClick,
}: BingoCellProps) {
  const { value, isFree, marked } = cell;

  // Build the className based on state for clean, readable styling.
  const base =
    "relative flex items-center justify-center aspect-square rounded-xl " +
    "text-lg sm:text-2xl font-bold transition-colors duration-200 select-none";

  let stateClasses: string;
  if (isFree) {
    stateClasses = "bg-neon-purple/30 text-neon-purple border border-neon-purple/60 shadow-neon-pink";
  } else if (inWinningLine) {
    // Cells on a completed line get the strongest highlight.
    stateClasses =
      "bg-neon-green/25 text-neon-green border border-neon-green shadow-neon-green";
  } else if (marked) {
    stateClasses =
      "bg-neon-pink/25 text-neon-pink border border-neon-pink/70 shadow-neon-pink";
  } else {
    stateClasses =
      "glass text-cyan-100 border-white/10 hover:bg-white/15 hover:border-neon-blue/70 hover:shadow-neon-blue";
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || isFree}
      // Subtle tactile feedback on press / hover.
      whileHover={!disabled && !isFree ? { scale: 1.06 } : undefined}
      whileTap={!disabled && !isFree ? { scale: 0.92 } : undefined}
      className={`${base} ${stateClasses} ${
        disabled && !isFree ? "cursor-not-allowed" : "cursor-pointer"
      }`}
      aria-pressed={marked}
      aria-label={isFree ? "Free space" : `Cell ${value}${marked ? ", marked" : ""}`}
    >
      {isFree ? "FREE" : value}

      {/* Animated cross (X) overlay shown when a numbered cell is marked. */}
      {marked && !isFree && (
        <motion.span
          initial={{ scale: 0, rotate: -90, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl text-neon-pink/80 pointer-events-none"
        >
          ✕
        </motion.span>
      )}
    </motion.button>
  );
}
