"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  UnoState,
  UnoCard,
  UnoColor,
  canPlay,
  topCard,
} from "@/lib/uno";
import { playerColor, initial } from "@/lib/colors";
import UnoCardView, { COLOR_HEX } from "./UnoCardView";
import ColorPicker from "./ColorPicker";

interface UnoTableProps {
  game: UnoState;
  meId: string;
  isMyTurn: boolean;
  onPlay: (cardId: string, opts?: { chosenColor?: UnoColor }) => void;
  onDraw: () => void;
  onPass: () => void;
  onUno: () => void;
  onCatch: (targetId: string) => void;
  onChallenge: () => void;
}

/** The UNO game table: opponents, center piles, your hand, and action buttons. */
export default function UnoTable({
  game,
  meId,
  isMyTurn,
  onPlay,
  onDraw,
  onPass,
  onUno,
  onCatch,
  onChallenge,
}: UnoTableProps) {
  const [wildCardId, setWildCardId] = useState<string | null>(null);

  const meIndex = game.players.findIndex((p) => p.id === meId);
  const me = game.players[meIndex];
  // Order opponents starting after me, following turn order for a natural layout.
  const opponents = useMemo(
    () =>
      game.players
        .map((p, i) => ({ p, i }))
        .filter((x) => x.i !== meIndex),
    [game.players, meIndex]
  );

  const top = topCard(game);
  const justDrewMine = game.justDrew?.player === meIndex;
  const draw4Pending = game.pendingDraw > 0 && game.pendingDrawType === "draw4";

  /** Whether a given card in my hand can be played right now. */
  const isPlayable = (card: UnoCard): boolean => {
    if (!isMyTurn) return false;
    if (game.justDrew) return justDrewMine && game.justDrew.cardId === card.id;
    if (game.pendingDraw > 0) {
      if (!game.settings.stacking) return false;
      if (game.pendingDrawType === "draw2") return card.kind === "draw2";
      if (game.pendingDrawType === "draw4") return card.kind === "wild4";
      return false;
    }
    return canPlay(card, game.currentColor, top);
  };

  const handleCardClick = (card: UnoCard) => {
    if (!isPlayable(card)) return;
    if (card.kind === "wild" || card.kind === "wild4") {
      setWildCardId(card.id); // need a color first
    } else {
      onPlay(card.id);
    }
  };

  const canDrawNow = isMyTurn && !game.justDrew;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
      {/* Opponents */}
      <div className="flex flex-wrap justify-center gap-4">
        {opponents.map(({ p, i }) => {
          const color = playerColor(p.id);
          const isTurn = i === game.current;
          const oneCard = p.hand.length === 1;
          const catchable = oneCard && !p.saidUno;
          return (
            <motion.div
              key={p.id}
              animate={{ boxShadow: isTurn ? `0 0 16px ${color}` : "0 0 0 transparent" }}
              className={`glass rounded-xl px-3 py-2 flex flex-col items-center gap-1 min-w-[88px] ${
                isTurn ? "border border-white/40" : "border border-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full font-bold text-black text-sm"
                  style={{ background: color }}
                >
                  {initial(p.name)}
                </span>
                <span className="text-sm font-semibold truncate max-w-[70px]" style={{ color }}>
                  {p.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-white/60">🂠 {p.hand.length}</span>
                {oneCard && (
                  <span className="text-[10px] font-bold text-yellow-400 animate-pulse">UNO</span>
                )}
              </div>
              {catchable && (
                <button
                  onClick={() => onCatch(p.id)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-red-400 text-red-400 hover:bg-red-400/20"
                >
                  Catch!
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Center: piles, direction, current color, pending */}
      <div className="flex items-center justify-center gap-6 sm:gap-10">
        {/* Draw pile */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onDraw}
            disabled={!canDrawNow}
            className={canDrawNow ? "cursor-pointer" : "cursor-default opacity-80"}
            aria-label="Draw a card"
          >
            <UnoCardView faceDown size="lg" />
          </button>
          <span className="text-xs text-white/50">Draw ({game.drawPile.length})</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl" title="Direction">
            {game.direction === 1 ? "↻" : "↺"}
          </span>
          {/* Current color */}
          <span
            className="h-5 w-5 rounded-full border border-white/40"
            style={{ background: COLOR_HEX[game.currentColor] }}
            title={`Current color: ${game.currentColor}`}
          />
          {game.pendingDraw > 0 && (
            <span className="text-xs font-bold text-red-400 animate-pulse text-center">
              +{game.pendingDraw}!
            </span>
          )}
        </div>

        {/* Discard pile (top card) */}
        <div className="flex flex-col items-center gap-2">
          <UnoCardView card={top} size="lg" />
          <span className="text-xs text-white/50">Discard</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {canDrawNow && (
          <ActionBtn color="blue" onClick={onDraw}>
            🂠 Draw{game.pendingDraw > 0 ? ` ${game.pendingDraw}` : ""}
          </ActionBtn>
        )}
        {justDrewMine && (
          <ActionBtn color="white" onClick={onPass}>
            Pass
          </ActionBtn>
        )}
        {draw4Pending && isMyTurn && game.settings.drawFourChallenge && (
          <ActionBtn color="red" onClick={onChallenge}>
            ⚖ Challenge
          </ActionBtn>
        )}
        <ActionBtn
          color="yellow"
          onClick={onUno}
          highlight={me?.hand.length === 1 && !me?.saidUno}
        >
          UNO!
        </ActionBtn>
      </div>

      {/* My hand */}
      <div className="w-full">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-sm text-cyan-200/70">
            Your hand ({me?.hand.length ?? 0})
          </span>
          {isMyTurn ? (
            <span className="text-sm font-bold text-green-400 animate-pulse">Your turn</span>
          ) : (
            <span className="text-sm text-white/40">
              {game.players[game.current]?.name}&apos;s turn
            </span>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-1.5 px-2">
          {me?.hand.map((card) => (
            <UnoCardView
              key={card.id}
              card={card}
              size="md"
              playable={isPlayable(card)}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>
      </div>

      <ColorPicker
        open={wildCardId !== null}
        onPick={(c) => {
          if (wildCardId) onPlay(wildCardId, { chosenColor: c });
          setWildCardId(null);
        }}
        onCancel={() => setWildCardId(null)}
      />
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  color,
  highlight,
}: {
  children: React.ReactNode;
  onClick: () => void;
  color: "blue" | "red" | "yellow" | "white";
  highlight?: boolean;
}) {
  const colors = {
    blue: "border-neon-blue text-neon-blue hover:bg-neon-blue/20",
    red: "border-red-400 text-red-400 hover:bg-red-400/20",
    yellow: "border-yellow-400 text-yellow-400 hover:bg-yellow-400/20",
    white: "border-white/40 text-white/80 hover:bg-white/10",
  } as const;
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      animate={highlight ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={highlight ? { duration: 0.8, repeat: Infinity } : undefined}
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl border-2 font-bold uppercase tracking-wider text-sm transition-all ${colors[color]}`}
    >
      {children}
    </motion.button>
  );
}
