"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Player } from "@/lib/game";
import { playerColor, initial } from "@/lib/colors";

interface WinModalProps {
  open: boolean;
  winnerName: string | null;
  /** Whether the local player is the winner. */
  isMe: boolean;
  /** Players ranked by completed lines. */
  leaderboard: Array<{ player: Player; lines: number }>;
  meId: string;
  onPlayAgain: () => void;
  onLobby: () => void;
}

/**
 * Win overlay shown to EVERYONE when a player completes BINGO. Displays the
 * winner's name (or "YOU WIN!" for the winner) plus a final leaderboard.
 */
export default function WinModal({
  open,
  winnerName,
  isMe,
  leaderboard,
  meId,
  onPlayAgain,
  onLobby,
}: WinModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.6, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="glass rounded-3xl px-8 py-10 sm:px-12 text-center max-w-sm w-full"
          >
            <div className="text-5xl mb-2">🏆</div>
            <motion.h2
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-3xl sm:text-5xl font-extrabold text-neon-green animate-glow"
              style={{ color: "#39ff14" }}
            >
              {isMe ? "YOU WIN!" : `${winnerName} WINS!`}
            </motion.h2>
            <p className="mt-2 text-cyan-100/80">Full BINGO — 5 lines complete! 🎉</p>

            {/* Final leaderboard */}
            <ul className="mt-6 flex flex-col gap-2 text-left">
              {leaderboard.map(({ player, lines }, i) => {
                const color = playerColor(player.id);
                return (
                  <li
                    key={player.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-1.5 bg-white/5"
                  >
                    <span className="w-5 text-white/50 text-sm">{i + 1}.</span>
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full font-bold text-black"
                      style={{ background: color }}
                    >
                      {initial(player.name)}
                    </span>
                    <span className="flex-1 truncate" style={{ color }}>
                      {player.name}
                      {player.id === meId && (
                        <span className="text-white/40"> (you)</span>
                      )}
                    </span>
                    <span className="text-white/70 text-sm">{lines}/5</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 flex gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onPlayAgain}
                className="px-6 py-3 rounded-xl border-2 border-neon-green text-neon-green font-bold uppercase tracking-wider hover:bg-neon-green/20 hover:shadow-neon-green transition-all"
              >
                Play Again
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLobby}
                className="px-6 py-3 rounded-xl border-2 border-white/30 text-white/80 font-bold uppercase tracking-wider hover:bg-white/10 transition-all"
              >
                Lobby
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
