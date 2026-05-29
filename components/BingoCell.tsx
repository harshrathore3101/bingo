"use client";

import { motion } from "framer-motion";

interface BingoCellProps {
  value: number;
  /** Whether this number has been called (marked on the card). */
  marked: boolean;
  /** Whether the cell is part of a completed line. */
  inWinningLine: boolean;
  /** Whether the player can click this cell to call its number right now. */
  clickable: boolean;
  /** True if this is the most recently called number (gets a pulse). */
  isLast?: boolean;
  /** Initial + color of the player who called this number (attribution badge). */
  callerInitial?: string;
  callerColor?: string;
  onClick: () => void;
}

/**
 * A single number on a player's card.
 * Visual states: callable (your turn, uncalled), marked (called), winning line.
 * When marked, shows the caller's initial badge so you can see WHO called it.
 */
export default function BingoCell({
  value,
  marked,
  inWinningLine,
  clickable,
  isLast,
  callerInitial,
  callerColor,
  onClick,
}: BingoCellProps) {
  const base =
    "relative flex items-center justify-center aspect-square rounded-xl " +
    "text-lg sm:text-2xl font-bold transition-colors duration-200 select-none";

  let stateClasses: string;
  if (inWinningLine) {
    stateClasses = "bg-neon-green/25 text-neon-green border border-neon-green shadow-neon-green";
  } else if (marked) {
    stateClasses = "bg-neon-pink/25 text-neon-pink border border-neon-pink/70 shadow-neon-pink";
  } else if (clickable) {
    stateClasses =
      "glass text-cyan-100 border-neon-blue/40 hover:bg-neon-blue/20 hover:border-neon-blue hover:shadow-neon-blue cursor-pointer";
  } else {
    stateClasses = "glass text-cyan-100/80 border-white/10";
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      whileHover={clickable ? { scale: 1.06 } : undefined}
      whileTap={clickable ? { scale: 0.92 } : undefined}
      animate={isLast ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`${base} ${stateClasses} ${!clickable ? "cursor-default" : ""}`}
      aria-label={`Number ${value}${marked ? ", called" : ""}`}
    >
      {value}

      {/* Cross overlay + caller badge when the number has been called. */}
      {marked && (
        <>
          <motion.span
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl text-neon-pink/70 pointer-events-none"
          >
            ✕
          </motion.span>
          {callerInitial && (
            <span
              className="absolute -top-1.5 -right-1.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full text-[9px] sm:text-[10px] flex items-center justify-center font-bold text-black ring-1 ring-black/40"
              style={{ background: callerColor }}
              title="Called by"
            >
              {callerInitial}
            </span>
          )}
        </>
      )}
    </motion.button>
  );
}
