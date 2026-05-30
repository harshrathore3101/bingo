"use client";

import { AnimatePresence, motion } from "framer-motion";
import { UNO_COLORS, UnoColor } from "@/lib/uno";
import { COLOR_HEX } from "./UnoCardView";

interface ColorPickerProps {
  open: boolean;
  onPick: (color: UnoColor) => void;
  onCancel: () => void;
}

/** Modal shown when a player plays a Wild / Wild Draw Four to choose a color. */
export default function ColorPicker({ open, onPick, onCancel }: ColorPickerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-3xl p-8 text-center"
          >
            <h3 className="text-xl font-bold text-white mb-6">Choose a color</h3>
            <div className="grid grid-cols-2 gap-4">
              {UNO_COLORS.map((c) => (
                <motion.button
                  key={c}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPick(c)}
                  className="h-20 w-20 rounded-2xl border-2 border-white/40 shadow-lg"
                  style={{ background: COLOR_HEX[c] }}
                  aria-label={c}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
