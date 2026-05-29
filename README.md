# 🎮 Neon Bingo

A fully functional, glowing **BINGO game** built with **Next.js (App Router) + React + TypeScript + Tailwind CSS + Framer Motion**.

A real-time **multiplayer** game: join a room, take turns calling numbers, and race to complete rows / columns / diagonals to spell **B-I-N-G-O**. The first player to 5 lines wins — announced on every screen with confetti. Realtime sync is powered by **Supabase**.

---

## ✨ Features

- **Real-time multiplayer rooms** — join by room number, synced via Supabase
- **Named players** with stable per-player neon colors & avatars
- **Turn-based "chance by chance"** play — each player has their own 5×5 card
- Tap a number to **call** it; it marks on **everyone's** card (animated ✕)
- **Caller attribution** — a "Called" log + per-cell badge show who called what
- Live **roster** with per-player line progress and a glowing turn indicator
- Each completed line lights a **BINGO** letter; winning lines highlighted
- **First to 5 lines wins** — winner announced on every screen + confetti + leaderboard
- **Presence** ("N online"), shareable link, and a **Skip turn** safety button
- Neon / glassmorphism dark theme, fully **responsive**, **Framer Motion** animations

---

## 📁 Folder Structure

```
bingo/
├── app/
│   ├── globals.css            # Tailwind layers + neon theme + glassmorphism
│   ├── layout.tsx             # Root layout, Orbitron font
│   ├── page.tsx               # Lobby (enter / create a room)
│   └── room/[code]/page.tsx   # Room route → RoomGame
├── components/
│   ├── Lobby.tsx              # Join / create a room number
│   ├── RoomGame.tsx           # Orchestrates the turn-based room
│   ├── JoinRoom.tsx           # Name-entry gate
│   ├── PlayerList.tsx         # Roster + line progress + turn glow + winner
│   ├── CalledLog.tsx          # History of who called which number
│   ├── TurnBanner.tsx         # "Your turn" / "Waiting for X"
│   ├── BingoBoard.tsx         # A player's 5×5 card
│   ├── BingoCell.tsx          # Single number (callable / called / caller badge)
│   ├── BingoHeader.tsx        # Animated "B I N G O" title (your letters)
│   └── WinModal.tsx           # Winner announcement + leaderboard
├── hooks/
│   └── useRoom.ts             # Realtime room sync + identity + presence
├── lib/
│   ├── bingo.ts               # Pure board/line/card utilities
│   ├── game.ts                # GameState + turn-based reducers
│   ├── colors.ts              # Stable per-player neon colors
│   └── supabase.ts            # Supabase client + RoomRow type
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
└── next.config.mjs
```

---

## 🧠 Utility Functions (`lib/bingo.ts`)

| Function | Purpose |
|---|---|
| `generateBoard()` | Builds a random board (unique numbers per column, FREE center) |
| `detectCompletedLines(cells)` | Returns indices of all fully-marked lines (rows/cols/diagonals) |
| `lettersEarned(count)` | Completed-line count → number of BINGO letters (capped at 5) |
| `hasWon(count)` | `true` once 5 distinct lines are complete |
| `highlightedCells(lineIndices)` | Set of cell indices on any completed line (for highlighting) |
| `WINNING_LINES` | Precomputed 12 winning lines (5 rows + 5 cols + 2 diagonals) |

The logic is **framework-agnostic and pure**, so the UI derives everything from
the board state (single source of truth) and it's easy to test.

---

## 🚀 Setup & Run

Requires **Node 18.18+** (Node 20 recommended).

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
# → open http://localhost:3000

# Production build
npm run build
npm start
```

---

## 🎯 How to Play

1. On the **lobby** (`/`), enter a room number (or create one) to get a
   shareable `/room/<number>` link.
2. **Enter your name** and join. Share the link so friends join the same room.
3. Anyone presses **Start** — everyone is dealt their own 5×5 card (1–25).
4. **Take turns**: on your turn, tap a number on your card to **call** it. It
   marks on every player's card. Watch the **Called** log to see who called what.
5. Complete a full **row, column, or diagonal** to light a BINGO letter.
   **First to 5 lines wins** — announced on every screen with confetti. 🎉
6. **Play Again** for a fresh round, or back to the **Lobby**.

---

## 👥 Multiplayer Rooms — Classic Turn-Based Bingo (Supabase Realtime)

Players who open the **same room number** play together in real time:

1. **Join with a name** — every player picks a display name.
2. **Lobby** — players gather; anyone can press **Start**. Each player is dealt
   their **own** shuffled 1–25 card.
3. **Chance by chance** — on your turn you tap a number on your card to **call**
   it. That number is marked on **every** player's card. The turn rotates.
4. **Live attribution** — a "Called" log shows **who called which number**, and
   each marked cell carries the caller's initial badge.
5. **First to 5 lines wins** — the **winner is announced on every screen** with
   confetti and a final leaderboard.

Extras: per-player line-progress bars + turn glow in the roster, live
"players online" presence count, shareable room link, and a **Skip turn**
button in case a player goes AFK.

- Lobby: `/` — enter or create a room number
- Game: `/room/<number>` — shareable link

### Setup

**1. Create a free Supabase project** at [supabase.com](https://supabase.com).

**2. Create the `rooms` table + realtime + policies.** In the Supabase
dashboard → **SQL Editor**, run:

```sql
-- The entire game state for a room lives in one jsonb column.
-- (If you previously created a `rooms` table with cells/started columns,
--  this DROP migrates it to the new turn-based schema — no data is lost
--  since rooms are transient.)
drop table if exists public.rooms;

create table public.rooms (
  id         text primary key,          -- room code, e.g. "1234"
  state      jsonb not null,            -- full game state (players, turn, calls, winner)
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security and allow anonymous play
alter table public.rooms enable row level security;

create policy "rooms_select" on public.rooms for select using (true);
create policy "rooms_insert" on public.rooms for insert with check (true);
create policy "rooms_update" on public.rooms for update using (true);

-- Broadcast row changes to all subscribers in real time
alter publication supabase_realtime add table public.rooms;
```

> The permissive policies above are fine for a casual game. Tighten them if you
> need stronger guarantees.

**3. Add your keys.** Copy `.env.local.example` → `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```
harshrathore3101

Find both in **Project Settings → API**. On **Vercel**, add the same two env
vars in **Project → Settings → Environment Variables**, then redeploy.

**4. Run it** and open `/room/1234` in two browsers/devices to see live sync.

### How sync works

- `lib/game.ts` — pure, serializable `GameState` + reducers (`addPlayer`,
  `startGame`, `callNumber`, `skipTurn`, winner detection). All transitions are
  deterministic and framework-agnostic.
- `lib/supabase.ts` — shared browser client (null-safe if env is missing).
- `hooks/useRoom.ts` — reads/creates the room row, subscribes to Postgres
  change events, applies a reducer + writes the full state on each action
  (optimistic + realtime echo), keeps a stable per-browser player identity in
  `localStorage`, and tracks presence for the online count.
- `components/` — `JoinRoom` (name gate), `PlayerList` (roster + progress +
  turn glow), `CalledLog` (who called what), `TurnBanner`, `BingoBoard`/
  `BingoCell` (your card), and `WinModal` (winner + leaderboard). Win detection
  & confetti run locally on each client from the shared state, so everyone
  celebrates together.

If the env vars are absent, the lobby shows a setup warning and the rest of the
UI still renders.

---

Built with ❤️ + neon glow.
