// Deterministic neon color per player id, so each player has a stable color
// across all screens (used for avatars, turn glow, caller badges).
const PALETTE = [
  "#ff2d95", // pink
  "#00d4ff", // blue
  "#39ff14", // green
  "#fdfd00", // yellow
  "#9d4edd", // purple
  "#ff6b35", // orange
  "#00ffc8", // teal
  "#ff5dde", // magenta
];

export function playerColor(id: string): string {
  // Simple stable hash of the id → palette index.
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** First letter (uppercased) for avatar / caller badges. */
export function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}
