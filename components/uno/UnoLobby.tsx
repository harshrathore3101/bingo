"use client";

import { motion } from "framer-motion";
import { UnoRoom, MIN_PLAYERS, MAX_PLAYERS } from "@/lib/unoRoom";
import { UnoSettings } from "@/lib/uno";
import { playerColor, initial } from "@/lib/colors";

interface UnoLobbyProps {
  room: UnoRoom;
  meId: string;
  isHost: boolean;
  code: string;
  onReady: (ready: boolean) => void;
  onSettings: (s: Partial<UnoSettings>) => void;
  onStart: () => void;
}

const SETTING_DEFS: Array<{ key: keyof UnoSettings; label: string; help: string; soon?: boolean }> = [
  { key: "stacking", label: "Stacking", help: "Draw 2 / Draw 4 stack onto each other" },
  { key: "sevenZero", label: "7-0 Rule", help: "7 swaps hands · 0 rotates all hands" },
  { key: "drawFourChallenge", label: "Challenge Draw 4", help: "Targeted player may challenge a Wild Draw Four" },
  { key: "jumpIn", label: "Jump-In", help: "Coming soon", soon: true },
];

/** Pre-game lobby: roster, ready toggles, host settings, and Start. */
export default function UnoLobby({
  room,
  meId,
  isHost,
  code,
  onReady,
  onSettings,
  onStart,
}: UnoLobbyProps) {
  const me = room.members.find((m) => m.id === meId);
  const enoughPlayers = room.members.length >= MIN_PLAYERS;

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-3xl">
      {/* Roster */}
      <div className="glass rounded-2xl p-5 flex-1">
        <h3 className="text-sm uppercase tracking-wider text-cyan-200/70 mb-3">
          Players ({room.members.length}/{MAX_PLAYERS})
        </h3>
        <ul className="flex flex-col gap-2">
          {room.members.map((m) => {
            const color = playerColor(m.id);
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2 bg-white/5"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-black"
                  style={{ background: color }}
                >
                  {initial(m.name)}
                </span>
                <span className="flex-1 truncate font-semibold" style={{ color }}>
                  {m.name}
                  {m.id === room.hostId && <span className="text-white/40"> · host</span>}
                  {m.id === meId && <span className="text-white/40"> (you)</span>}
                </span>
                <span className={`text-xs ${m.ready ? "text-green-400" : "text-white/40"}`}>
                  {m.ready ? "✓ Ready" : "…"}
                </span>
              </li>
            );
          })}
        </ul>

        <button
          onClick={() => onReady(!me?.ready)}
          className={`mt-4 w-full py-2.5 rounded-xl border-2 font-bold uppercase tracking-wider transition-all ${
            me?.ready
              ? "border-white/30 text-white/70 hover:bg-white/10"
              : "border-green-400 text-green-400 hover:bg-green-400/20"
          }`}
        >
          {me?.ready ? "Not ready" : "I'm ready"}
        </button>
      </div>

      {/* Settings + Start */}
      <div className="glass rounded-2xl p-5 flex-1">
        <h3 className="text-sm uppercase tracking-wider text-cyan-200/70 mb-3">
          House rules {isHost ? "" : "(host controls)"}
        </h3>
        <ul className="flex flex-col gap-2">
          {SETTING_DEFS.map((s) => {
            const on = room.settings[s.key];
            return (
              <li key={s.key} className="flex items-center gap-3">
                <button
                  disabled={!isHost || s.soon}
                  onClick={() => onSettings({ [s.key]: !on } as Partial<UnoSettings>)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    on ? "bg-green-500" : "bg-white/15"
                  } ${!isHost || s.soon ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <motion.span
                    layout
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white"
                    style={{ left: on ? "1.5rem" : "0.125rem" }}
                  />
                </button>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm">{s.label}</p>
                  <p className="text-cyan-100/50 text-xs">{s.help}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {isHost ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            disabled={!enoughPlayers}
            className="mt-5 w-full py-3 rounded-xl border-2 border-yellow-400 text-yellow-400 font-bold uppercase tracking-wider hover:bg-yellow-400/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ▶ Start Game
          </motion.button>
        ) : (
          <p className="mt-5 text-center text-cyan-200/60 text-sm">
            Waiting for the host to start…
          </p>
        )}
        {!enoughPlayers && (
          <p className="mt-2 text-center text-white/40 text-xs">
            Need at least {MIN_PLAYERS} players.
          </p>
        )}
      </div>
    </div>
  );
}
