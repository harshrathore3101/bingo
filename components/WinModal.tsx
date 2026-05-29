"use client";

import { AnimatePresence, motion } from "framer-motion";

interface WinModalProps {
  open: boolean;
  onPlayAgain: () => void;
}

/**
 * Full-screen celebratory overlay shown when the player completes BINGO.
 * Confetti itself is fired imperatively from the page (canvas-confetti);
 * this component handles the "YOU WIN" card + Play Again action.
 */
export default function WinModal({ open, onPlayAgain }: WinModalProps) {
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
            className="glass rounded-3xl px-8 py-10 sm:px-14 sm:py-12 text-center max-w-sm w-full"
          >
            <motion.h2
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-4xl sm:text-6xl font-extrabold text-neon-green animate-glow"
              style={{ color: "#39ff14" }}
            >
              YOU WIN
            </motion.h2>
            <p className="mt-4 text-cyan-100/80">
              You completed all five lines — full BINGO! 🎉
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPlayAgain}
              className="mt-8 px-8 py-3 rounded-xl border-2 border-neon-pink text-neon-pink font-bold uppercase tracking-wider hover:bg-neon-pink/20 hover:shadow-neon-pink transition-all"
            >
              Play Again
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
