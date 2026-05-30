// ---------------------------------------------------------------------------
// lib/uno.ts
// Pure, framework-agnostic UNO rules engine (Phase 1).
//
// All state transitions are pure: each action takes a state and returns a NEW
// state (the input is never mutated — we work on a structuredClone). This makes
// the engine deterministic and easy to unit-test, and lets the same logic run
// on the client and be synced via Supabase (the chosen transport).
//
// NOTE on authority: with a serverless/Supabase setup there is no Node server,
// so this engine runs client-side. It validates every action and refuses
// illegal ones, but it is not a hard anti-cheat boundary — that would require a
// dedicated server (or Postgres RPC) to run this same logic authoritatively.
//
// Scope: core official rules are implemented (deck, deal, first-card rules,
// play/draw/pass, skip/reverse/draw-two/wild/wild-four, UNO call + catch,
// draw-four challenge, scoring) plus the Stacking and 7-0 house rules. Jump-in
// and turn timers are layered in a later phase.
// ---------------------------------------------------------------------------

export type UnoColor = "red" | "yellow" | "green" | "blue";
export const UNO_COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];

export type UnoKind = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4";

export interface UnoCard {
  id: string;
  color: UnoColor | null; // null only for wild / wild4 while undecided
  kind: UnoKind;
  n: number | null; // 0–9 for number cards, else null
}

export type Direction = 1 | -1;
export type UnoPhase = "playing" | "finished";

export interface UnoPlayer {
  id: string;
  name: string;
  hand: UnoCard[];
  /** Set true when the player has declared "UNO" at one card. */
  saidUno: boolean;
}

export interface UnoSettings {
  stacking: boolean; // Draw Two / Draw Four stack
  sevenZero: boolean; // 7 = swap hands, 0 = rotate hands
  drawFourChallenge: boolean; // allow challenging a Wild Draw Four
  jumpIn: boolean; // reserved for a later phase
}

export const DEFAULT_SETTINGS: UnoSettings = {
  stacking: false,
  sevenZero: false,
  drawFourChallenge: true,
  jumpIn: false,
};

export interface UnoState {
  phase: UnoPhase;
  players: UnoPlayer[];
  drawPile: UnoCard[];
  discardPile: UnoCard[]; // last element is the top card
  currentColor: UnoColor; // active color (Wild sets this)
  current: number; // index of the player to act
  direction: Direction;
  /** Accumulated forced-draw from stacked Draw Two / Draw Four. */
  pendingDraw: number;
  pendingDrawType: null | "draw2" | "draw4";
  /** When a player draws, they may play THAT card or pass; tracked here. */
  justDrew: { player: number; cardId: string } | null;
  /** Whether the last Wild Draw Four was legal (no color match) — for challenges. */
  lastWildFourLegal: boolean | null;
  winnerId: string | null;
  settings: UnoSettings;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  state: UnoState;
}

// --- Deck -----------------------------------------------------------------

/** Build a standard 108-card UNO deck with unique ids. */
export function createDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let id = 0;
  const add = (color: UnoColor | null, kind: UnoKind, n: number | null) =>
    deck.push({ id: `c${id++}`, color, kind, n });

  for (const color of UNO_COLORS) {
    add(color, "number", 0); // one 0
    for (let n = 1; n <= 9; n++) {
      add(color, "number", n); // two each of 1–9
      add(color, "number", n);
    }
    for (const kind of ["skip", "reverse", "draw2"] as UnoKind[]) {
      add(color, kind, null);
      add(color, kind, null);
    }
  }
  for (let i = 0; i < 4; i++) {
    add(null, "wild", null);
    add(null, "wild4", null);
  }
  return deck; // 4×25 + 8 = 108
}

/** Fisher–Yates shuffle (pure). `rng` is injectable for deterministic tests. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Helpers --------------------------------------------------------------

export function topCard(state: UnoState): UnoCard {
  return state.discardPile[state.discardPile.length - 1];
}

/** Id of the player whose turn it is (null if the game is over). */
export function currentPlayerId(state: UnoState): string | null {
  if (state.phase !== "playing") return null;
  return state.players[state.current]?.id ?? null;
}

/** Index `steps` players ahead of `from` in the current direction. */
function step(state: UnoState, from: number, steps = 1): number {
  const n = state.players.length;
  return (((from + state.direction * steps) % n) + n) % n;
}

function clone(state: UnoState): UnoState {
  return structuredClone(state);
}

/** Reshuffle the discard pile (minus the top card) back into the draw pile. */
function refillDraw(state: UnoState, rng: () => number) {
  if (state.drawPile.length > 0) return;
  const top = state.discardPile.pop()!;
  state.drawPile = shuffle(state.discardPile, rng);
  state.discardPile = [top];
}

function drawInto(state: UnoState, player: number, count: number, rng: () => number) {
  for (let i = 0; i < count; i++) {
    refillDraw(state, rng);
    const card = state.drawPile.pop();
    if (card) state.players[player].hand.push(card);
  }
}

// --- Setup ----------------------------------------------------------------

/** Deal 7 cards each, flip the first card, and apply first-card rules. */
export function startGame(
  players: Array<{ id: string; name: string }>,
  settings: UnoSettings = DEFAULT_SETTINGS,
  rng: () => number = Math.random
): UnoState {
  let deck = shuffle(createDeck(), rng);
  const hands: UnoCard[][] = players.map(() => []);
  for (let r = 0; r < 7; r++) {
    for (let p = 0; p < players.length; p++) hands[p].push(deck.pop()!);
  }

  // Flip the first card; a Wild Draw Four may not start the game.
  let first = deck.pop()!;
  while (first.kind === "wild4") {
    deck.unshift(first);
    deck = shuffle(deck, rng);
    first = deck.pop()!;
  }

  const state: UnoState = {
    phase: "playing",
    players: players.map((p, i) => ({
      id: p.id,
      name: p.name,
      hand: hands[i],
      saidUno: false,
    })),
    drawPile: deck,
    discardPile: [first],
    currentColor: first.color ?? UNO_COLORS[Math.floor(rng() * 4)],
    current: 0,
    direction: 1,
    pendingDraw: 0,
    pendingDrawType: null,
    justDrew: null,
    lastWildFourLegal: null,
    winnerId: null,
    settings,
  };

  // First-card effects (official rules).
  switch (first.kind) {
    case "draw2":
      drawInto(state, 0, 2, rng);
      state.current = step(state, 0); // player 0 skipped
      break;
    case "reverse":
      state.direction = -1;
      state.current = step(state, 0); // proceeds in reverse from player 0
      break;
    case "skip":
      state.current = step(state, 0);
      break;
    default:
      break; // number / wild: player 0 starts (wild color chosen above)
  }

  return state;
}

// --- Play validation ------------------------------------------------------

/** Can `card` legally be played on top of the current color/top card? */
export function canPlay(card: UnoCard, currentColor: UnoColor, top: UnoCard): boolean {
  if (card.kind === "wild" || card.kind === "wild4") return true;
  if (card.color === currentColor) return true; // color match
  if (card.kind === "number" && top.kind === "number" && card.n === top.n) return true; // number match
  if (card.kind !== "number" && card.kind === top.kind) return true; // symbol match
  return false;
}

/** A Wild Draw Four is "legal" only if the player has no card of the current color. */
export function isWildFourLegal(hand: UnoCard[], currentColor: UnoColor, cardId: string): boolean {
  return !hand.some((c) => c.id !== cardId && c.color === currentColor);
}

// --- Actions --------------------------------------------------------------

/**
 * Play a card. Validates turn ownership, legality, and pending-draw / stacking
 * constraints, then applies the card's effect and advances the turn.
 */
export function playCard(
  prev: UnoState,
  playerId: string,
  cardId: string,
  opts: { chosenColor?: UnoColor; targetId?: string } = {},
  rng: () => number = Math.random
): ActionResult {
  if (prev.phase !== "playing") return { ok: false, error: "Game is over", state: prev };

  const idx = prev.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return { ok: false, error: "Unknown player", state: prev };
  if (idx !== prev.current) return { ok: false, error: "Not your turn", state: prev };

  const player = prev.players[idx];
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return { ok: false, error: "Card not in hand", state: prev };

  const top = topCard(prev);

  // While a draw penalty is pending (stacking), you may only stack a matching
  // draw card; anything else must be a draw to resolve the penalty.
  if (prev.pendingDraw > 0) {
    const stackable =
      prev.settings.stacking &&
      ((prev.pendingDrawType === "draw2" && card.kind === "draw2") ||
        (prev.pendingDrawType === "draw4" && card.kind === "wild4"));
    if (!stackable) {
      return { ok: false, error: "Must draw the pending cards", state: prev };
    }
  } else if (!canPlay(card, prev.currentColor, top)) {
    return { ok: false, error: "Card doesn't match", state: prev };
  }

  if ((card.kind === "wild" || card.kind === "wild4") && !opts.chosenColor) {
    return { ok: false, error: "Choose a color", state: prev };
  }

  const state = clone(prev);
  const me = state.players[idx];

  // Remove the card from hand and place on the discard pile.
  me.hand = me.hand.filter((c) => c.id !== cardId);
  const played: UnoCard = { ...card };
  state.justDrew = null;

  // Resolve color.
  if (played.kind === "wild" || played.kind === "wild4") {
    state.currentColor = opts.chosenColor!;
    played.color = opts.chosenColor!;
    state.lastWildFourLegal =
      played.kind === "wild4"
        ? isWildFourLegal(player.hand, prev.currentColor, cardId)
        : state.lastWildFourLegal;
  } else {
    state.currentColor = played.color!;
  }
  state.discardPile.push(played);

  // Win check (UNO-call penalties are handled separately via catchUno).
  if (me.hand.length === 0) {
    state.phase = "finished";
    state.winnerId = me.id;
    return { ok: true, state };
  }
  // Declaring UNO is a separate action; reaching >1 card clears the flag.
  if (me.hand.length !== 1) me.saidUno = false;

  // Apply the card's effect + advance the turn.
  applyEffect(state, idx, played, opts, rng);
  return { ok: true, state };
}

function applyEffect(
  state: UnoState,
  idx: number,
  card: UnoCard,
  opts: { targetId?: string },
  rng: () => number
) {
  const n = state.players.length;

  switch (card.kind) {
    case "skip":
      state.current = step(state, idx, 2);
      break;

    case "reverse":
      state.direction = (state.direction * -1) as Direction;
      // In a 2-player game, Reverse acts as Skip (turn returns to player).
      state.current = n === 2 ? idx : step(state, idx, 1);
      break;

    case "draw2":
      // The target resolves the penalty on their turn (drawCard advances past
      // them). With stacking on they may instead play another Draw Two.
      state.pendingDraw += 2;
      state.pendingDrawType = "draw2";
      state.current = step(state, idx, 1);
      break;

    case "wild4":
      // Same pending flow — this also gives the target a window to challenge
      // (or, with stacking, to play another Wild Draw Four) before drawing.
      state.pendingDraw += 4;
      state.pendingDrawType = "draw4";
      state.current = step(state, idx, 1);
      break;

    case "number":
      // 7-0 house rule.
      if (state.settings.sevenZero && card.n === 7) {
        const targetIdx = opts.targetId
          ? state.players.findIndex((p) => p.id === opts.targetId)
          : step(state, idx, 1);
        if (targetIdx !== -1) {
          const tmp = state.players[idx].hand;
          state.players[idx].hand = state.players[targetIdx].hand;
          state.players[targetIdx].hand = tmp;
        }
        state.current = step(state, idx, 1);
      } else if (state.settings.sevenZero && card.n === 0) {
        const hands = state.players.map((p) => p.hand);
        for (let i = 0; i < n; i++) {
          state.players[step(state, i, 1)].hand = hands[i];
        }
        state.current = step(state, idx, 1);
      } else {
        state.current = step(state, idx, 1);
      }
      break;

    case "wild":
    default:
      state.current = step(state, idx, 1);
      break;
  }
}

/**
 * Draw from the pile. If a draw penalty is pending and the player chooses not
 * to stack, this resolves it (draw all pending, lose turn). Otherwise it's a
 * normal single draw — the player may then play the drawn card or pass.
 */
export function drawCard(
  prev: UnoState,
  playerId: string,
  rng: () => number = Math.random
): ActionResult {
  if (prev.phase !== "playing") return { ok: false, error: "Game is over", state: prev };
  const idx = prev.players.findIndex((p) => p.id === playerId);
  if (idx !== prev.current) return { ok: false, error: "Not your turn", state: prev };

  const state = clone(prev);

  if (state.pendingDraw > 0) {
    drawInto(state, idx, state.pendingDraw, rng);
    state.pendingDraw = 0;
    state.pendingDrawType = null;
    state.lastWildFourLegal = null; // penalty accepted → no challenge
    state.justDrew = null;
    state.current = step(state, idx, 1); // penalty resolved → turn passes
    return { ok: true, state };
  }

  drawInto(state, idx, 1, rng);
  const drawn = state.players[idx].hand[state.players[idx].hand.length - 1];
  // Player may immediately play the drawn card if it's playable, else must pass.
  if (drawn && canPlay(drawn, state.currentColor, topCard(state))) {
    state.justDrew = { player: idx, cardId: drawn.id };
  } else {
    state.justDrew = null;
    state.current = step(state, idx, 1);
  }
  return { ok: true, state };
}

/** Pass after drawing a non-played card. */
export function pass(prev: UnoState, playerId: string): ActionResult {
  const idx = prev.players.findIndex((p) => p.id === playerId);
  if (idx !== prev.current) return { ok: false, error: "Not your turn", state: prev };
  if (!prev.justDrew || prev.justDrew.player !== idx) {
    return { ok: false, error: "You must draw first", state: prev };
  }
  const state = clone(prev);
  state.justDrew = null;
  state.current = step(state, idx, 1);
  return { ok: true, state };
}

/** Declare UNO (valid when at one card, or about to be). */
export function callUno(prev: UnoState, playerId: string): ActionResult {
  const state = clone(prev);
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return { ok: false, error: "Unknown player", state: prev };
  me.saidUno = true;
  return { ok: true, state };
}

/**
 * Catch a player who is at one card and failed to declare UNO. Penalty: the
 * caught player draws two cards.
 */
export function catchUno(
  prev: UnoState,
  targetId: string,
  rng: () => number = Math.random
): ActionResult {
  const idx = prev.players.findIndex((p) => p.id === targetId);
  if (idx === -1) return { ok: false, error: "Unknown player", state: prev };
  const target = prev.players[idx];
  if (target.hand.length !== 1 || target.saidUno) {
    return { ok: false, error: "Nothing to catch", state: prev };
  }
  const state = clone(prev);
  drawInto(state, idx, 2, rng);
  return { ok: true, state };
}

/**
 * Resolve a Wild Draw Four challenge by the player who was targeted.
 *  - success (it was illegal): the offender draws 4 instead, target is freed
 *  - failure (it was legal): the challenger draws the original 4 + 2 = 6
 */
export function challengeDrawFour(
  prev: UnoState,
  challengerId: string,
  rng: () => number = Math.random
): ActionResult {
  if (!prev.settings.drawFourChallenge) {
    return { ok: false, error: "Challenges disabled", state: prev };
  }
  if (prev.lastWildFourLegal === null) {
    return { ok: false, error: "Nothing to challenge", state: prev };
  }
  const state = clone(prev);
  const challengerIdx = state.players.findIndex((p) => p.id === challengerId);
  // The offender is the player who just played (previous in direction).
  const offenderIdx = step(state, challengerIdx, -1);

  if (state.lastWildFourLegal === false) {
    // Challenge succeeds — offender draws 4, challenger keeps their turn.
    drawInto(state, offenderIdx, 4, rng);
    state.pendingDraw = 0;
    state.pendingDrawType = null;
    state.current = challengerIdx;
  } else {
    // Challenge fails — challenger draws 6 and loses their turn.
    drawInto(state, challengerIdx, 6, rng);
    state.pendingDraw = 0;
    state.pendingDrawType = null;
    state.current = step(state, challengerIdx, 1);
  }
  state.lastWildFourLegal = null;
  return { ok: true, state };
}

// --- Scoring --------------------------------------------------------------

/** Point value of a single card (UNO round scoring). */
export function cardScore(card: UnoCard): number {
  if (card.kind === "number") return card.n ?? 0;
  if (card.kind === "skip" || card.kind === "reverse" || card.kind === "draw2") return 20;
  return 50; // wild, wild4
}

export function handScore(hand: UnoCard[]): number {
  return hand.reduce((sum, c) => sum + cardScore(c), 0);
}

/** Round result: the winner scores the sum of everyone else's remaining cards. */
export function roundResult(state: UnoState): { winnerId: string | null; points: number } {
  if (!state.winnerId) return { winnerId: null, points: 0 };
  const points = state.players
    .filter((p) => p.id !== state.winnerId)
    .reduce((sum, p) => sum + handScore(p.hand), 0);
  return { winnerId: state.winnerId, points };
}
