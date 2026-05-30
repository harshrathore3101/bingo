import { describe, it, expect } from "vitest";
import {
  createDeck,
  shuffle,
  startGame,
  canPlay,
  isWildFourLegal,
  playCard,
  drawCard,
  pass,
  callUno,
  catchUno,
  challengeDrawFour,
  cardScore,
  handScore,
  roundResult,
  topCard,
  DEFAULT_SETTINGS,
  UnoCard,
  UnoColor,
  UnoKind,
  UnoState,
  UnoPlayer,
} from "@/lib/uno";

// Deterministic RNG so deals/shuffles are reproducible in tests.
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function card(id: string, color: UnoColor | null, kind: UnoKind, n: number | null = null): UnoCard {
  return { id, color, kind, n };
}

function player(id: string, hand: UnoCard[]): UnoPlayer {
  return { id, name: id.toUpperCase(), hand, saidUno: false };
}

function state(partial: Partial<UnoState>): UnoState {
  return {
    phase: "playing",
    players: [],
    drawPile: [],
    discardPile: [card("top", "red", "number", 5)],
    currentColor: "red",
    current: 0,
    direction: 1,
    pendingDraw: 0,
    pendingDrawType: null,
    justDrew: null,
    lastWildFourLegal: null,
    winnerId: null,
    settings: { ...DEFAULT_SETTINGS },
    ...partial,
  };
}

const filler = (id = "f") => card(id, "blue", "number", 1); // never matches red top

describe("deck", () => {
  it("has 108 cards with the correct composition", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(108);
    expect(deck.filter((c) => c.kind === "wild")).toHaveLength(4);
    expect(deck.filter((c) => c.kind === "wild4")).toHaveLength(4);
    expect(deck.filter((c) => c.kind === "number" && c.n === 0)).toHaveLength(4); // one 0 per color
    expect(deck.filter((c) => c.kind === "number" && c.n === 5)).toHaveLength(8); // two 5s per color
    expect(deck.filter((c) => c.kind === "draw2")).toHaveLength(8);
    // All ids unique.
    expect(new Set(deck.map((c) => c.id)).size).toBe(108);
  });

  it("shuffle preserves the multiset and is deterministic for a seed", () => {
    const deck = createDeck();
    const a = shuffle(deck, seeded(42));
    const b = shuffle(deck, seeded(42));
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect([...a].sort((x, y) => x.id.localeCompare(y.id))).toEqual(
      [...deck].sort((x, y) => x.id.localeCompare(y.id))
    );
  });
});

describe("startGame", () => {
  it("deals 7 to each player and flips a non-wild4 first card", () => {
    const s = startGame(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      DEFAULT_SETTINGS,
      seeded(7)
    );
    expect(s.players.map((p) => p.hand.length)).toEqual([7, 7, 7]);
    expect(s.discardPile).toHaveLength(1);
    expect(topCard(s).kind).not.toBe("wild4");
    // 108 - 21 dealt - 1 discard = 86 in draw pile.
    expect(s.drawPile).toHaveLength(86);
  });
});

describe("canPlay", () => {
  const top = card("t", "red", "number", 7);
  it("matches by color, number, symbol, and wild", () => {
    expect(canPlay(card("x", "red", "number", 2), "red", top)).toBe(true); // color
    expect(canPlay(card("x", "green", "number", 7), "red", top)).toBe(true); // number
    expect(canPlay(card("x", "green", "skip"), "red", card("t", "red", "skip"))).toBe(true); // symbol
    expect(canPlay(card("x", null, "wild"), "red", top)).toBe(true); // wild
    expect(canPlay(card("x", "blue", "number", 2), "red", top)).toBe(false); // no match
  });
});

describe("action cards", () => {
  it("skip advances two players", () => {
    const s = state({
      players: [player("a", [card("s", "red", "skip"), filler()]), player("b", []), player("c", [])],
    });
    const r = playCard(s, "a", "s");
    expect(r.ok).toBe(true);
    expect(r.state.current).toBe(2); // b skipped
  });

  it("reverse acts as skip in a 2-player game", () => {
    const s = state({
      players: [player("a", [card("r", "red", "reverse"), filler()]), player("b", [])],
    });
    const r = playCard(s, "a", "r");
    expect(r.state.direction).toBe(-1);
    expect(r.state.current).toBe(0); // turn returns to A
  });

  it("reverse flips direction with 3+ players", () => {
    const s = state({
      players: [player("a", [card("r", "red", "reverse"), filler()]), player("b", []), player("c", [])],
    });
    const r = playCard(s, "a", "r");
    expect(r.state.direction).toBe(-1);
    expect(r.state.current).toBe(2);
  });

  it("draw two: target draws the pending two on their turn, then is skipped", () => {
    const s = state({
      players: [player("a", [card("d", "red", "draw2"), filler()]), player("b", []), player("c", [])],
      drawPile: [card("p1", "green", "number", 3), card("p2", "green", "number", 4)],
    });
    const afterPlay = playCard(s, "a", "d");
    expect(afterPlay.state.pendingDraw).toBe(2);
    expect(afterPlay.state.current).toBe(1); // B must resolve the penalty
    const afterDraw = drawCard(afterPlay.state, "b");
    expect(afterDraw.state.players[1].hand).toHaveLength(2);
    expect(afterDraw.state.current).toBe(2); // B skipped after drawing
  });

  it("wild requires a chosen color and sets the active color", () => {
    const s = state({ players: [player("a", [card("w", null, "wild"), filler()]), player("b", [])] });
    expect(playCard(s, "a", "w").ok).toBe(false); // no color
    const r = playCard(s, "a", "w", { chosenColor: "green" });
    expect(r.ok).toBe(true);
    expect(r.state.currentColor).toBe("green");
  });
});

describe("wild draw four legality", () => {
  it("is illegal when the player holds the current color", () => {
    const hand = [card("w", null, "wild4"), card("r", "red", "number", 2)];
    expect(isWildFourLegal(hand, "red", "w")).toBe(false);
  });
  it("is legal when the player has no current-color card", () => {
    const hand = [card("w", null, "wild4"), card("b", "blue", "number", 2)];
    expect(isWildFourLegal(hand, "red", "w")).toBe(true);
  });
});

describe("draw / pass", () => {
  it("lets a player play a drawn card if playable", () => {
    const s = state({
      players: [player("a", []), player("b", [])],
      drawPile: [card("d", "red", "number", 9)], // matches red → playable
    });
    const r = drawCard(s, "a");
    expect(r.state.justDrew?.cardId).toBe("d");
    expect(r.state.current).toBe(0); // still A's turn to play or pass
  });

  it("passes automatically when the drawn card is unplayable", () => {
    const s = state({
      players: [player("a", []), player("b", [])],
      drawPile: [card("d", "blue", "number", 9)], // no match → pass
    });
    const r = drawCard(s, "a");
    expect(r.state.justDrew).toBeNull();
    expect(r.state.current).toBe(1);
  });

  it("pass after a playable draw moves to the next player", () => {
    const s = state({
      players: [player("a", [card("d", "red", "number", 9)]), player("b", [])],
      justDrew: { player: 0, cardId: "d" },
    });
    const r = pass(s, "a");
    expect(r.ok).toBe(true);
    expect(r.state.current).toBe(1);
  });
});

describe("UNO call & catch", () => {
  it("penalizes a one-card player who didn't call UNO", () => {
    const s = state({
      players: [player("a", [filler()]), player("b", [])],
      drawPile: [card("p1", "green", "number", 3), card("p2", "green", "number", 4)],
    });
    const r = catchUno(s, "a");
    expect(r.ok).toBe(true);
    expect(r.state.players[0].hand).toHaveLength(3); // +2 penalty
  });

  it("does not penalize a player who called UNO", () => {
    const s = state({ players: [{ ...player("a", [filler()]), saidUno: true }, player("b", [])] });
    expect(callUno(s, "a").state.players[0].saidUno).toBe(true);
    expect(catchUno(s, "a").ok).toBe(false);
  });
});

describe("draw four challenge", () => {
  const drawPile = Array.from({ length: 6 }, (_, i) => card(`p${i}`, "green", "number", 1));

  it("successful challenge makes the offender draw four", () => {
    const s = state({
      players: [player("a", []), player("b", []), player("c", [])],
      current: 0, // A challenges
      lastWildFourLegal: false, // it was illegal
      drawPile,
    });
    const r = challengeDrawFour(s, "a");
    expect(r.ok).toBe(true);
    expect(r.state.players[2].hand).toHaveLength(4); // offender (prev = C) draws 4
    expect(r.state.current).toBe(0); // challenger keeps turn
  });

  it("failed challenge makes the challenger draw six and lose the turn", () => {
    const s = state({
      players: [player("a", []), player("b", []), player("c", [])],
      current: 0,
      lastWildFourLegal: true, // it was legal
      drawPile,
    });
    const r = challengeDrawFour(s, "a");
    expect(r.state.players[0].hand).toHaveLength(6);
    expect(r.state.current).toBe(1);
  });
});

describe("stacking house rule", () => {
  it("accumulates the pending draw when stacking is enabled", () => {
    const s = state({
      settings: { ...DEFAULT_SETTINGS, stacking: true },
      players: [player("a", [card("d", "red", "draw2"), filler()]), player("b", [card("d2", "blue", "draw2")]), player("c", [])],
    });
    const r = playCard(s, "a", "d");
    expect(r.state.pendingDraw).toBe(2);
    expect(r.state.pendingDrawType).toBe("draw2");
    expect(r.state.current).toBe(1); // B may stack or draw
  });
});

describe("seven-zero house rule", () => {
  it("7 swaps hands with the chosen player", () => {
    const s = state({
      settings: { ...DEFAULT_SETTINGS, sevenZero: true },
      players: [
        player("a", [card("seven", "red", "number", 7), card("keep", "blue", "number", 1)]),
        player("b", [card("x", "green", "number", 2), card("y", "green", "number", 3), card("z", "green", "number", 4)]),
      ],
    });
    const r = playCard(s, "a", "seven", { targetId: "b" });
    // A had [keep] after playing 7; swaps with B's 3 cards.
    expect(r.state.players[0].hand.map((c) => c.id)).toEqual(["x", "y", "z"]);
    expect(r.state.players[1].hand.map((c) => c.id)).toEqual(["keep"]);
  });

  it("0 rotates all hands in the direction of play", () => {
    const s = state({
      settings: { ...DEFAULT_SETTINGS, sevenZero: true },
      players: [
        player("a", [card("zero", "red", "number", 0), card("a1", "blue", "number", 1)]),
        player("b", [card("b1", "green", "number", 2)]),
        player("c", [card("c1", "green", "number", 3)]),
      ],
    });
    const r = playCard(s, "a", "zero");
    // A keeps [a1] before rotation; rotating forward: B<-A, C<-B, A<-C.
    expect(r.state.players[1].hand.map((c) => c.id)).toEqual(["a1"]); // B got A's
    expect(r.state.players[2].hand.map((c) => c.id)).toEqual(["b1"]); // C got B's
    expect(r.state.players[0].hand.map((c) => c.id)).toEqual(["c1"]); // A got C's
  });
});

describe("scoring", () => {
  it("scores cards by UNO values", () => {
    expect(cardScore(card("x", "red", "number", 5))).toBe(5);
    expect(cardScore(card("x", "red", "skip"))).toBe(20);
    expect(cardScore(card("x", "red", "draw2"))).toBe(20);
    expect(cardScore(card("x", null, "wild"))).toBe(50);
    expect(cardScore(card("x", null, "wild4"))).toBe(50);
    expect(handScore([card("a", "red", "number", 5), card("b", null, "wild4")])).toBe(55);
  });

  it("awards the winner the sum of opponents' hands", () => {
    const s = state({
      phase: "finished",
      winnerId: "a",
      players: [
        player("a", []),
        player("b", [card("b1", "red", "number", 9)]),
        player("c", [card("c1", null, "wild")]),
      ],
    });
    expect(roundResult(s)).toEqual({ winnerId: "a", points: 59 });
  });

  it("declares a winner when a hand becomes empty", () => {
    const s = state({ players: [player("a", [card("last", "red", "number", 3)]), player("b", [])] });
    const r = playCard(s, "a", "last");
    expect(r.state.phase).toBe("finished");
    expect(r.state.winnerId).toBe("a");
  });
});
