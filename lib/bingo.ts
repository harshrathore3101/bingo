// ---------------------------------------------------------------------------
// lib/bingo.ts
// Pure, framework-agnostic game logic for the Bingo board.
// Keeping this logic separate from React makes it trivial to unit-test and
// reuse, and keeps components focused purely on rendering.
// ---------------------------------------------------------------------------

/** A single cell on the board. */
export interface Cell {
  /** Displayed value: a number, or null for the FREE center space. */
  value: number | null;
  /** Whether this cell is the FREE center space. */
  isFree: boolean;
  /** Whether the user has marked (crossed) this cell. */
  marked: boolean;
}

export const GRID_SIZE = 5; // 5x5 board
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE; // 25
export const CENTER_INDEX = 12; // middle cell of a 5x5 grid (row 2, col 2)
export const BINGO_LETTERS = ["B", "I", "N", "G", "O"] as const;

/** Return `count` unique random integers from the inclusive range [min, max]. */
function pickUnique(min: number, max: number, count: number): number[] {
  const pool: number[] = [];
  for (let n = min; n <= max; n++) pool.push(n);

  // Fisher-Yates shuffle, then slice the first `count` numbers.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * Generate a fresh board as a flat, row-major array of 25 cells.
 * All 25 cells hold a unique number from 1–25 — there is no FREE space.
 * Every cell starts unmarked.
 */
export function generateBoard(): Cell[] {
  // Shuffle all 25 numbers across the board, one per cell.
  const numbers = pickUnique(1, 25, TOTAL_CELLS);

  return numbers.map((value) => ({
    value,
    isFree: false,
    marked: false,
  }));
}

/**
 * All 12 winning lines as arrays of cell indices:
 * 5 rows + 5 columns + 2 diagonals.
 * Computed once at module load.
 */
export const WINNING_LINES: number[][] = (() => {
  const lines: number[][] = [];

  // Rows
  for (let r = 0; r < GRID_SIZE; r++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, c) => r * GRID_SIZE + c));
  }
  // Columns
  for (let c = 0; c < GRID_SIZE; c++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, r) => r * GRID_SIZE + c));
  }
  // Diagonals
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => i * GRID_SIZE + i)); // top-left → bottom-right
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => i * GRID_SIZE + (GRID_SIZE - 1 - i))); // top-right → bottom-left

  return lines;
})();

/**
 * Detect every fully-marked line on the board.
 * Returns the indices (into WINNING_LINES) of all completed lines.
 * Using line *indices* as identity lets the caller dedupe lines so the same
 * completed line is never counted toward BINGO twice.
 */
export function detectCompletedLines(cells: Cell[]): number[] {
  // Guard against an incomplete/empty board (e.g. before a player has joined
  // and been dealt a card) — `cells[idx]` may be undefined.
  if (cells.length < TOTAL_CELLS) return [];
  const completed: number[] = [];
  WINNING_LINES.forEach((line, i) => {
    if (line.every((idx) => cells[idx]?.marked)) completed.push(i);
  });
  return completed;
}

/**
 * Number of BINGO letters earned = number of completed lines, capped at 5.
 * (B, I, N, G, O — one letter per completed line.)
 */
export function lettersEarned(completedLineCount: number): number {
  return Math.min(completedLineCount, BINGO_LETTERS.length);
}

/** The player wins once 5 distinct lines are complete (all letters earned). */
export function hasWon(completedLineCount: number): boolean {
  return completedLineCount >= BINGO_LETTERS.length;
}

/**
 * Set of all cell indices that belong to at least one completed line.
 * Used to apply the "winning line" highlight to the relevant cells.
 */
export function highlightedCells(completedLineIndices: number[]): Set<number> {
  const set = new Set<number>();
  completedLineIndices.forEach((lineIdx) => {
    WINNING_LINES[lineIdx].forEach((cellIdx) => set.add(cellIdx));
  });
  return set;
}

// ---------------------------------------------------------------------------
// Per-player cards (classic turn-based Bingo)
// In the multiplayer game each player gets their OWN card: the same numbers
// 1–25, but shuffled into a different layout. A "called" number is marked on
// every card, so different layouts complete lines at different times.
// ---------------------------------------------------------------------------

/** A player's card: the numbers 1–25 shuffled into 25 positions. */
export function generateCard(): number[] {
  return pickUnique(1, 25, TOTAL_CELLS);
}

/**
 * Build display cells for a card given the set of called numbers.
 * A cell is marked iff its number has been called.
 */
export function cellsFromCard(card: number[], called: Set<number>): Cell[] {
  return card.map((value) => ({
    value,
    isFree: false,
    marked: called.has(value),
  }));
}

/** Number of completed lines on a card given the called numbers. */
export function cardLineCount(card: number[], called: Set<number>): number {
  return detectCompletedLines(cellsFromCard(card, called)).length;
}
