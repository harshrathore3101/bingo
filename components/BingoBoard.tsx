"use client";

import { motion } from "framer-motion";
import type { Cell } from "@/lib/bingo";
import BingoCell from "./BingoCell";

interface BingoBoardProps {
  cells: Cell[];
  /** Set of cell indices that belong to a completed line. */
  winningCells: Set<number>;
  /** When false, cells cannot be toggled (game not started or already won). */
  interactive: boolean;
  onToggle: (index: number) => void;
}

// Stagger children so the board "deals in" nicely on (re)generation.
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.02 },
  },
};
const item = {
  hidden: { opacity: 0, scale: 0.5 },
  show: { opacity: 1, scale: 1 },
};

/**
 * Renders the 5x5 grid of cells inside a glassmorphism panel.
 * Delegates per-cell rendering to <BingoCell />.
 */
export default function BingoBoard({
  cells,
  winningCells,
  interactive,
  onToggle,
}: BingoBoardProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="glass grid grid-cols-5 gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl w-full max-w-md"
    >
      {cells.map((cell, index) => (
        <motion.div key={index} variants={item}>
          <BingoCell
            cell={cell}
            inWinningLine={winningCells.has(index)}
            disabled={!interactive}
            onClick={() => onToggle(index)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
