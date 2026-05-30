"use client";

import { AnimatePresence, motion } from "framer-motion";
import { UnoState, handScore } from "@/lib/uno";
import { playerColor, initial } from "@/lib/colors";

interface UnoWinModalProps {
  open: boolean;
  game: UnoState | null;
  meId: string;
  isHost: boolean;
  onPlayAgain: () => void;
  onLobby: () => void;
}

/** End-of-round overlay: winner + per-player remaining-hand scores. */
export default function UnoWinModal({
  open,
  game,
  meId,
  isHost,
  onPlayAgain,
  onLobby,
}: UnoWinModalProps) {
  const winner = game?.players.find((p) => p.id === game.winnerId);
  // The winner scores the sum of everyone else's remaining cards.
  const winnerPoints = game
    ? game.players.filter((p) => p.id !== game.winnerId).reduce((s, p) => s + handScore(p.hand), 0)
    : 0;

  return (
    <AnimatePresence>
      {open && game && (
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
            className="glass rounded-3xl px-8 py-10 text-center max-w-sm w-full"
          >
            <div className="text-5xl mb-2">🏆</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-yellow-400">
              {winner?.id === meId ? "YOU WIN!" : `${winner?.name} WINS!`}
            </h2>
            <p className="mt-2 text-cyan-100/80">
              +{winnerPoints} points this round
            </p>

            <ul className="mt-6 flex flex-col gap-2 text-left">
              {game.players.map((p) => {
                const color = playerColor(p.id);
                const isWinner = p.id === game.winnerId;
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-1.5 bg-white/5"
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full font-bold text-black"
                      style={{ background: color }}
                    >
                      {initial(p.name)}
                    </span>
                    <span className="flex-1 truncate" style={{ color }}>
                      {p.name}
                      {p.id === meId && <span className="text-white/40"> (you)</span>}
                    </span>
                    <span className="text-white/70 text-sm">
                      {isWinner ? "winner" : `${p.hand.length} left`}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 flex gap-3 justify-center">
              {isHost && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPlayAgain}
                  className="px-6 py-3 rounded-xl border-2 border-green-400 text-green-400 font-bold uppercase tracking-wider hover:bg-green-400/20 transition-all"
                >
                  Play Again
                </motion.button>
              )}
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
