# 2048 Game Design

## Module Boundaries

```
index.html          Shell: viewport meta, <div id="game">, no CDN references
src/game/           types.ts (shared types), rng.ts (seedable PRNG), engine.ts (pure fns)
src/ui/             render.ts (DOM), input.ts (events -> Direction), game.ts (glue)
src/main.ts         Bootstrap: imports styles.css, calls startGame(#game)
src/styles.css      All styles, loaded via main.ts
```

Dependency rules: `game/` never touches the DOM or globals; `ui/` never mutates
state — it replaces it only with engine return values; `main.ts` is the sole composer.

## Board Representation

Flat `readonly number[]`, length 16, row-major (`idx = row*4 + col`), 0 = empty.
Chosen over a 2D array: one allocation per board, immutable copy by spread,
trivial column extraction. tsconfig deliberately does NOT enable
`noUncheckedIndexedAccess` (indices 0–15 are always valid).

## Types (`src/game/types.ts`)

```ts
export type Board = readonly number[];   // length 16, 0 = empty
export type Direction = 'up' | 'down' | 'left' | 'right';
export interface GameState {
  board: Board;  score: number;
  won: boolean;          // sticky; set once on first 2048 tile
  over: boolean;         // true when no moves remain
  keepPlaying: boolean;  // UI sets to dismiss win overlay
}
export interface MoveResult {
  state: GameState;      // same object reference when !moved
  moved: boolean;        gained: number;  // score added by this move
}
```

## Engine API (`src/game/engine.ts` + `src/game/rng.ts`) — all pure

```ts
// rng.ts
export type Rng = () => number;                 // uniform [0,1)
export function createRng(seed: number): Rng;   // Mulberry32
export function randomSeed(): number;           // uint32 via crypto.getRandomValues
// engine.ts
export function newGame(rng: Rng): GameState;
export function move(state: GameState, dir: Direction, rng: Rng): MoveResult;
export function canMove(state: GameState): boolean;
// exported for unit tests:
export function slideRow(row: readonly number[]): [readonly number[], number];
export function emptyCells(board: Board): number[];
export function spawnTile(board: Board, index: number, rng: Rng): Board;
export function createGameState(
  board: Board, score = 0, won = false, over = false, keepPlaying = false,
): GameState;
```

### Move semantics

`slideRow` (leftward primitive): compact -> merge left-to-right (each tile
merges at most once per pass) -> compact -> pad to 4; returns `[row, gained]`;
`[2,2,4,8] -> [4,4,8,0]`, gained 4. Directions: left slides each row; right
reverses/slides/reverses-back; up/down extract column j (j, j+4, j+8, j+12;
reversed for down), slide, write back.
`move`: no tile shifts -> `{ state, moved: false, gained: 0 }`, SAME state
reference, rng NOT consumed. Otherwise spawn one tile at a random empty index
(`rng() < 0.9 ? 2 : 4`), `score += gained`,
`won = state.won || board.some(v => v === 2048)`, `over = !canMove(newState)`.
`newGame`: exactly two spawned tiles, score 0, flags false. `canMove`: any
empty cell, or any horizontal/vertical equal non-zero neighbor pair.

## Input (`src/ui/input.ts`)

```ts
export function bindInput(el: HTMLElement, onDirection: (d: Direction) => void): () => void;
```

Returns cleanup that removes all listeners it added.
- Keyboard: `keydown` on `document`; map `e.key` — ArrowUp/w/W -> up,
  ArrowDown/s/S -> down, ArrowLeft/a/A -> left, ArrowRight/d/D -> right;
  `preventDefault()` on arrow keys only; held keys are throttled to one move
  per 150 ms (`KEY_REPEAT_MS` cooldown) so OS auto-repeat can't spam the score.
- Touch: `touchstart`/`touchend`/`touchcancel` on `el` with `{ passive: false }`;
  `preventDefault()` on start only when the touch begins on the board (blocks
  scroll/zoom while playing; header/overlay button touches are left alone so their
  click fires). Start: store `(sx, sy)`;
  end: `dx = x - sx`, `dy = y - sy`, ignore if `max(|dx|, |dy|) < 30`;
  axis lock: `|dx| > |dy|` -> horizontal (sign of dx), else vertical (sign of
  dy); cancel: reset start so a stale position never fires a move. CSS also sets
  `touch-action: none` on the board.

## UI State Management (`src/ui/game.ts`)

```ts
export function startGame(root: HTMLElement): void;
```

Holds `let state` and `let rng = createRng(randomSeed())`.
On direction: if `state.over || (state.won && !state.keepPlaying)` -> ignore;
else `result = move(state, dir, rng)`; if `result.moved` ->
`state = result.state`, re-render. New Game -> fresh `rng` (new `randomSeed()`)
then `newGame(rng)`. Keep going -> `state = { ...state, keepPlaying: true }`
(UI concern; the engine never reads it).

## Rendering (`src/ui/render.ts`)

```ts
export function render(
  root: HTMLElement, state: GameState,
  onNewGame: () => void, onKeepPlaying: () => void,
): void;
```

Rebuilds `root`'s children every call (16 cells — no virtualization):
- Header: title, score box (`state.score`), New Game button.
- Board: CSS grid 4x4, one cell per index, `class="tile tile-{v}"` with the
  number as text; `v === 0` -> `tile-0` (no text); `v >= 4096` -> single fallback
  class `tile-super` (uses `--tile-super`).
- Win overlay (iff `won && !keepPlaying`): "You win!" + Keep going button.
  Game-over overlay (iff `over`): "Game over!" + New Game button. Overlays sit
  absolutely over the board, semi-transparent bg, flexbox-centered.

## Styling (`src/styles.css`)

Classic palette as CSS custom properties:

```css
:root {
  --page-bg: #faf8ef;  --board-bg: #bbada0;  --empty-cell: rgba(238,228,218,.35);
  --tile-2: #eee4da;  --tile-4: #ede0c8;  --tile-8: #f2b179;  --tile-16: #f59563;
  --tile-32: #f67c5f; --tile-64: #f65e3b; --tile-128: #edcf72; --tile-256: #edcc61;
  --tile-512: #edc850; --tile-1024: #edc53f; --tile-2048: #edc22e; --tile-super: #3c3a32;
  --text-dark: #776e65; --text-light: #f9f6f2; --font: system-ui, -apple-system, sans-serif;
}
```

Note: the plan calls the 2048 tile "orange"; the classic `#edc22e` warm amber is
what's intended — do not pick a different hue. Text: `--text-dark` on 2/4,
`--text-light` on 8+. Layout: page is a centered column flex; board is
`width: min(90vw, 420px); aspect-ratio: 1;` with `gap: 2vmin` — fits 360px with
no horizontal scroll. Tile font size by digit count: 1–2 digits `min(8vw, 34px)`,
3 digits `min(6.5vw, 28px)`, 4+ `min(5.5vw, 24px)`. System font stack only.

## Build & Hosting

- `vite.config.ts`: `base: '/2048/'` — every built asset URL is prefixed so the
  site works at the GitHub Pages sub-path.
- `tsconfig.json`: `strict: true` (and `noUncheckedIndexedAccess` OFF).
- Scripts: `dev` (vite), `build` (-> `dist/`), `test` (vitest run), `test:watch`.
- `index.html`: viewport meta `width=device-width, initial-scale=1`,
  `<div id="game">`, module script at `/src/main.ts`.
- Deploy: publish `dist/` to GitHub Pages; site
  `https://anton-trautman.github.io/2048/`.

## Testing Strategy (vitest)

Engine unit tests in `src/game/engine.test.ts` (UI is smoke-checked in Task 3):
- `slideRow`: `[8,0,0,8] -> [16,0,0,0]` (g 16); `[2,2,4,8] -> [4,4,8,0]` (g 4);
  `[2,2,2,2] -> [4,4,0,0]` (g 8); `[4,4,8,8] -> [8,16,0,0]` (g 24); no-op row (g 0);
  all-zeros row.
- `move`: one hand-computed case per direction; no-op -> `moved: false`, SAME
  state reference, unchanged rng stream; success spawns exactly one tile and
  bumps score by `gained`.
- `newGame`: exactly two non-zero tiles (each 2 or 4); score 0; flags false.
- Win: 2048 on board -> `won: true`, sticky across later moves. Game over: full
  board, no equal neighbors -> `canMove` false, `move` sets `over: true`.
- Determinism: same seed + same direction sequence -> identical final states.
  rng: same seed -> identical sequence; outputs in [0,1); `randomSeed()` in
  [0, 2^32).