"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface JoinUnoProps {
  code: string;
  defaultName: string;
  playerCount: number;
  locked: boolean; // game already started
  onJoin: (name: string) => void;
}

/** Name gate before entering an UNO room. */
export default function JoinUno({ code, defaultName, playerCount, locked, onJoin }: JoinUnoProps) {
  const [name, setName] = useState(defaultName);
  const submit = () => name.trim() && onJoin(name.trim());

  if (locked) {
    return (
      <div className="glass rounded-2xl p-6 max-w-sm text-center flex flex-col items-center gap-3">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-bold text-red-400">Game in progress</h2>
        <p className="text-cyan-200/80 text-sm">
          This UNO room has already started. You can join once the current round
          ends and players return to the lobby.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
    >
      <h2 className="text-2xl font-bold text-yellow-400 text-center">
        Join UNO <span className="tracking-widest">{code}</span>
      </h2>
      <p className="text-cyan-200/70 text-sm text-center -mt-2">
        {playerCount === 0
          ? "Be the first in — pick a name."
          : `${playerCount} player${playerCount > 1 ? "s" : ""} waiting.`}
      </p>
      <input
        autoFocus
        value={name}
        maxLength={16}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Your name"
        className="bg-black/40 border-2 border-yellow-400/50 focus:border-yellow-400 rounded-xl px-4 py-3 text-xl text-center text-yellow-300 outline-none transition-colors"
      />
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={submit}
        disabled={!name.trim()}
        className="px-5 py-3 rounded-xl border-2 border-green-400 text-green-400 font-bold uppercase tracking-wider hover:bg-green-400/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Enter Lobby
      </motion.button>
    </motion.div>
  );
}
