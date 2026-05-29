"use client";

import { motion } from "framer-motion";
import BingoCell from "./BingoCell";

/** Caller attribution for a called number. */
export interface CallerInfo {
  initial: string;
  color: string;
}

interface BingoBoardProps {
  /** This player's card: 25 numbers in fixed positions. */
  card: number[];
  /** Set of called numbers (marked on the card). */
  called: Set<number>;
  /** Cell indices that belong to a completed line. */
  winningCells: Set<number>;
  /** Whether the player may call a number now (their turn + game playing). */
  canCall: boolean;
  /** value → who called it, for the badge. */
  callerByValue: Map<number, CallerInfo>;
  /** The most recently called number (pulses). */
  lastCalled: number | null;
  onCall: (value: number) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.02 } },
};
const item = { hidden: { opacity: 0, scale: 0.5 }, show: { opacity: 1, scale: 1 } };

/**
 * Renders this player's 5x5 card. A cell is clickable only when it's the
 * player's turn and the number hasn't been called yet.
 */
export default function BingoBoard({
  card,
  called,
  winningCells,
  canCall,
  callerByValue,
  lastCalled,
  onCall,
}: BingoBoardProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="glass grid grid-cols-5 gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl w-full max-w-md"
    >
      {card.map((value, index) => {
        const marked = called.has(value);
        const caller = callerByValue.get(value);
        return (
          <motion.div key={index} variants={item}>
            <BingoCell
              value={value}
              marked={marked}
              inWinningLine={winningCells.has(index)}
              clickable={canCall && !marked}
              isLast={value === lastCalled}
              callerInitial={caller?.initial}
              callerColor={caller?.color}
              onClick={() => onCall(value)}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
