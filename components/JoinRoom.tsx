"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface JoinRoomProps {
  code: string;
  defaultName: string;
  /** How many players are already in the room. */
  playerCount: number;
  onJoin: (name: string) => void;
}

/**
 * Name-entry gate shown before a client has joined a room. Players must pick a
 * display name (the "name requirement") before they can play.
 */
export default function JoinRoom({ code, defaultName, playerCount, onJoin }: JoinRoomProps) {
  const [name, setName] = useState(defaultName);

  const submit = () => {
    if (name.trim()) onJoin(name.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
    >
      <h2 className="text-2xl font-bold text-neon-blue text-center">
        Join Room <span className="tracking-widest">{code}</span>
      </h2>
      <p className="text-cyan-200/70 text-sm text-center -mt-2">
        {playerCount === 0
          ? "Be the first in! Pick a name to start."
          : `${playerCount} player${playerCount > 1 ? "s" : ""} already here.`}
      </p>

      <label className="text-sm text-cyan-200/80 uppercase tracking-wider">
        Your name
      </label>
      <input
        autoFocus
        value={name}
        maxLength={16}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="e.g. Alex"
        className="bg-black/40 border-2 border-neon-pink/50 focus:border-neon-pink rounded-xl px-4 py-3 text-xl text-center text-neon-pink outline-none transition-colors"
      />

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={submit}
        disabled={!name.trim()}
        className="px-5 py-3 rounded-xl border-2 border-neon-green text-neon-green font-bold uppercase tracking-wider hover:bg-neon-green/20 hover:shadow-neon-green transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Enter Game
      </motion.button>
    </motion.div>
  );
}
