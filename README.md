# 🎮 Neon Bingo

A fully functional, glowing **BINGO game** built with **Next.js (App Router) + React + TypeScript + Tailwind CSS + Framer Motion**.

Mark cells, complete rows / columns / diagonals to spell **B-I-N-G-O**, and win with a confetti celebration. Progress is saved to `localStorage`, so a refresh never loses your game.

---

## ✨ Features

- **5×5 grid** with real Bingo column ranges (B 1-15, I 16-30, N 31-45, G 46-60, O 61-75)
- **FREE** center space (always counts toward a line)
- **Start Game** / **Generate Numbers** / **New Game** controls
- Click to mark a cell with an animated **✕**, click again to unmark
- Each completed line lights up one **BINGO** letter with an animated glow
- Duplicate lines are never counted twice (lines tracked by identity)
- Winning lines are highlighted on the board
- **YOU WIN** modal + **confetti** when all 5 letters are earned; board locks
- Neon / glassmorphism dark theme, fully **responsive**
- Smooth **Framer Motion** animations and hover effects
- State persisted in **localStorage**

---

## 📁 Folder Structure

```
bingo/
├── app/
│   ├── globals.css        # Tailwind layers + neon theme + glassmorphism
│   ├── layout.tsx         # Root layout, Orbitron font
│   └── page.tsx           # Game container: state, localStorage, confetti
├── components/
│   ├── BingoBoard.tsx     # 5×5 grid wrapper
│   ├── BingoCell.tsx      # Single cell (marked / winning / hover states)
│   ├── BingoHeader.tsx    # Animated "B I N G O" title
│   ├── Controls.tsx       # Start / Generate / New Game buttons + progress
│   └── WinModal.tsx       # "YOU WIN" overlay
├── lib/
│   └── bingo.ts           # Pure game logic & utilities (see below)
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

1. Press **Start Game**.
2. Tap any number cell to mark it (✕). Tap again to unmark.
3. Each time you complete a full **row, column, or diagonal**, one BINGO letter lights up.
4. Complete **5 lines** to spell **BINGO** → **YOU WIN!** 🎉
5. **Generate Numbers** for a fresh board, or **New Game** to fully reset.

---

## 👥 Multiplayer Rooms (Supabase Realtime)

Players who open the **same room number** share one board. When any player
crosses a cell, it crosses on **every** player's screen instantly. A live
"players online" count is shown via Supabase presence.

- Lobby: `/` — enter or create a room number
- Game: `/room/<number>` — shareable link

### Setup

**1. Create a free Supabase project** at [supabase.com](https://supabase.com).

**2. Create the `rooms` table + realtime + policies.** In the Supabase
dashboard → **SQL Editor**, run:

```sql
-- Shared board state, one row per room
create table public.rooms (
  id         text primary key,          -- room code, e.g. "1234"
  cells      jsonb not null,            -- 25 cells (the shared board)
  started    boolean not null default false,
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

- `lib/supabase.ts` — shared browser client (null-safe if env is missing).
- `hooks/useRoom.ts` — reads/creates the room row, subscribes to Postgres
  change events, writes the full board on each action (optimistic + realtime
  echo), and tracks presence for the player count.
- `components/RoomGame.tsx` — renders the shared board; win/confetti are derived
  locally on each client from the shared state, so everyone celebrates together.

If the env vars are absent, the lobby shows a setup warning and the rest of the
UI still renders.

---

Built with ❤️ + neon glow.
