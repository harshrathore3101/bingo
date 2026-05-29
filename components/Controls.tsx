"use client";

import { motion } from "framer-motion";

interface ControlsProps {
  started: boolean;
  won: boolean;
  /** Number of completed lines, shown in the live progress readout. */
  completedLines: number;
  onStart: () => void;
  onGenerate: () => void;
  onRestart: () => void;
}

/** Shared neon button styling. */
function NeonButton({
  children,
  onClick,
  color,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  color: "blue" | "pink" | "green";
  disabled?: boolean;
}) {
  const colors = {
    blue: "border-neon-blue text-neon-blue hover:bg-neon-blue/20 hover:shadow-neon-blue",
    pink: "border-neon-pink text-neon-pink hover:bg-neon-pink/20 hover:shadow-neon-pink",
    green: "border-neon-green text-neon-green hover:bg-neon-green/20 hover:shadow-neon-green",
  } as const;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      className={`px-5 py-2.5 rounded-xl border-2 font-semibold uppercase tracking-wider text-sm sm:text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${colors[color]}`}
    >
      {children}
    </motion.button>
  );
}

/**
 * Game control bar: Start, Generate Numbers, New Game, plus a live readout of
 * how many lines have been completed.
 */
export default function Controls({
  started,
  won,
  completedLines,
  onStart,
  onGenerate,
  onRestart,
}: ControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Start is only relevant before the game begins. */}
        {!started && (
          <NeonButton color="green" onClick={onStart}>
            ▶ Start Game
          </NeonButton>
        )}

        {/* Generating a new board is allowed before start or any time the game
            isn't yet won. */}
        <NeonButton color="blue" onClick={onGenerate} disabled={won}>
          ⟳ Generate Numbers
        </NeonButton>

        <NeonButton color="pink" onClick={onRestart}>
          ↺ New Game
        </NeonButton>
      </div>

      {/* Live progress: completed lines out of 5 (max for BINGO). */}
      {started && (
        <p className="text-sm text-cyan-200/80">
          Lines completed:{" "}
          <span className="text-neon-green font-bold">
            {Math.min(completedLines, 5)}
          </span>{" "}
          / 5
        </p>
      )}
    </div>
  );
}
