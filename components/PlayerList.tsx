"use client";

import { motion } from "framer-motion";
import { GameState, playerLineCount, LINES_TO_WIN } from "@/lib/game";
import { playerColor, initial } from "@/lib/colors";

interface PlayerListProps {
  state: GameState;
  meId: string;
  /** Id of the player whose turn it is (null if not playing). */
  currentId: string | null;
}

/**
 * Roster of everyone in the room with their live line progress (out of 5),
 * a glowing highlight on whoever's turn it is, and a crown on the winner.
 */
export default function PlayerList({ state, meId, currentId }: PlayerListProps) {
  return (
    <div className="glass rounded-2xl p-4 w-full max-w-xs">
      <h3 className="text-sm uppercase tracking-wider text-cyan-200/70 mb-3">
        Players ({state.players.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {state.players.map((p) => {
          const color = playerColor(p.id);
          const lines = playerLineCount(state, p.id);
          const isTurn = p.id === currentId;
          const isWinner = p.id === state.winnerId;
          const isMe = p.id === meId;
          return (
            <motion.li
              key={p.id}
              layout
              animate={{
                boxShadow: isTurn ? `0 0 12px ${color}` : "0 0 0px transparent",
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 border transition-colors ${
                isTurn ? "bg-white/10 border-white/30" : "border-white/5"
              }`}
            >
              {/* Avatar */}
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-black"
                style={{ background: color }}
              >
                {initial(p.name)}
              </span>

              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold" style={{ color }}>
                  {p.name}
                  {isMe && <span className="text-white/40 font-normal"> (you)</span>}
                </p>
                {/* Line progress is private — only shown for your own row, so
                    you can't see how close opponents are to winning. */}
                {isMe && (
                  <div className="flex gap-1 mt-0.5">
                    {Array.from({ length: LINES_TO_WIN }).map((_, i) => (
                      <span
                        key={i}
                        className="h-1.5 w-4 rounded-full"
                        style={{ background: i < lines ? color : "rgba(255,255,255,0.12)" }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {isWinner && <span title="Winner">👑</span>}
              {isTurn && !isWinner && (
                <span className="text-xs text-white/60 animate-pulse">●</span>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
