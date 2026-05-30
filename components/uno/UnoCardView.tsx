"use client";

import { motion } from "framer-motion";
import { UnoCard, UnoColor } from "@/lib/uno";

export const COLOR_HEX: Record<UnoColor, string> = {
  red: "#ef4444",
  yellow: "#f59e0b",
  green: "#22c55e",
  blue: "#3b82f6",
};

/** Center glyph for a card. */
function glyph(card: UnoCard): string {
  switch (card.kind) {
    case "number":
      return String(card.n);
    case "skip":
      return "⦸";
    case "reverse":
      return "⇄";
    case "draw2":
      return "+2";
    case "wild":
      return "★";
    case "wild4":
      return "+4";
    default:
      return "";
  }
}

interface UnoCardViewProps {
  card?: UnoCard;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const SIZES = {
  sm: "w-9 h-14 text-base rounded-md",
  md: "w-14 h-20 text-2xl rounded-lg sm:w-16 sm:h-24",
  lg: "w-20 h-28 text-3xl rounded-xl",
} as const;

/**
 * Renders a single UNO card (or a face-down back). Wild cards show the
 * four-color corner motif; colored cards use their hue with a white pill.
 */
export default function UnoCardView({
  card,
  faceDown,
  size = "md",
  playable,
  selected,
  onClick,
}: UnoCardViewProps) {
  const dims = SIZES[size];

  if (faceDown || !card) {
    return (
      <div
        className={`${dims} flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-white/20 shadow-lg`}
      >
        <span className="font-extrabold italic text-white/80 -rotate-12 text-sm sm:text-base">
          UNO
        </span>
      </div>
    );
  }

  const isWild = card.kind === "wild" || card.kind === "wild4";
  // A played wild carries a chosen color; an in-hand wild stays black/rainbow.
  const bg = card.color ? COLOR_HEX[card.color] : "#1e293b";

  const Comp = onClick ? motion.button : motion.div;

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={onClick ? !playable : undefined}
      whileHover={playable ? { y: -10, scale: 1.05 } : undefined}
      whileTap={playable ? { scale: 0.95 } : undefined}
      className={`${dims} relative flex items-center justify-center font-extrabold shadow-lg border-2 transition-all ${
        playable
          ? "border-white cursor-pointer ring-2 ring-white/70"
          : "border-white/30"
      } ${selected ? "ring-4 ring-neon-yellow" : ""} ${
        onClick && !playable ? "opacity-60 cursor-default" : ""
      }`}
      style={{ background: bg, color: "#fff" }}
    >
      {/* Four-color motif for wild cards */}
      {isWild && !card.color && (
        <span className="absolute inset-1 grid grid-cols-2 grid-rows-2 rounded overflow-hidden opacity-90">
          <span style={{ background: COLOR_HEX.red }} />
          <span style={{ background: COLOR_HEX.blue }} />
          <span style={{ background: COLOR_HEX.yellow }} />
          <span style={{ background: COLOR_HEX.green }} />
        </span>
      )}
      <span
        className="relative z-10 drop-shadow"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
      >
        {glyph(card)}
      </span>
    </Comp>
  );
}
