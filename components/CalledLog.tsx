"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Call } from "@/lib/game";
import { playerColor } from "@/lib/colors";

interface CalledLogProps {
  called: Call[];
}

/**
 * History of every number called and WHO called it (the "show who clicked
 * which number" requirement). Most recent call is shown first and pulses.
 */
export default function CalledLog({ called }: CalledLogProps) {
  const reversed = [...called].reverse();
  const lastValue = called.at(-1)?.value;

  return (
    <div className="glass rounded-2xl p-4 w-full max-w-xs">
      <h3 className="text-sm uppercase tracking-wider text-cyan-200/70 mb-3">
        Called ({called.length})
      </h3>

      {called.length === 0 ? (
        <p className="text-white/40 text-sm">No numbers called yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {reversed.map((c, i) => {
              const color = playerColor(c.by);
              const isLast = c.value === lastValue && i === 0;
              return (
                <motion.li
                  key={`${c.value}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold text-black ${
                      isLast ? "animate-pulse" : ""
                    }`}
                    style={{ background: color }}
                  >
                    {c.value}
                  </span>
                  <span className="text-white/70 truncate">
                    called by <span style={{ color }}>{c.byName}</span>
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
