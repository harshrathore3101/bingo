"use client";

import { motion } from "framer-motion";
import { Player } from "@/lib/game";
import { playerColor } from "@/lib/colors";

interface TurnBannerProps {
  current: Player | null;
  isMyTurn: boolean;
}

/**
 * Prominent indicator of whose turn it is. Shows "Your turn!" to the active
 * player and "Waiting for X…" to everyone else.
 */
export default function TurnBanner({ current, isMyTurn }: TurnBannerProps) {
  if (!current) return null;
  const color = playerColor(current.id);

  return (
    <motion.div
      key={current.id + String(isMyTurn)}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-full px-5 py-2 text-center"
    >
      {isMyTurn ? (
        <span className="font-bold text-neon-green animate-pulse">
          🎯 Your turn — tap a number to call it!
        </span>
      ) : (
        <span className="text-cyan-100/90">
          Waiting for{" "}
          <span className="font-bold" style={{ color }}>
            {current.name}
          </span>{" "}
          to call…
        </span>
      )}
    </motion.div>
  );
}
