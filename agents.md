# 2048 — Agent Handoff (read before touching anything)

Full spec: [DESIGN.md](DESIGN.md) · Plan: [docs/plans/2048-game.md](docs/plans/2048-game.md)
· QA log: [docs/QA-STATUS.md](docs/QA-STATUS.md) (fill it as you go).

## Goal (user's request)

Make the game "as good as possible": thorough review + fixes, commit & push,
very detailed browser QA (layout, mechanics, responsiveness, animations).
The user accepts the result **on a phone** at
**https://anton-trautman.github.io/2048/** — verify the deployed site, then
report the URL + QA summary to the user.

## Hard constraints

1. **Pi only.** No codex/claude workers. The roster at `~/ml/roster/agents/*.md`
   (code-reviewer, typescript-reviewer, e2e-runner, ...) and
   `~/ml/roster/skills/*.md` (e2e-testing, accessibility, code-review-gate) are
   rubrics/checklists — read the relevant ones and apply them yourself.
2. **Resource discipline.** A previous session crashed from resource
   exhaustion; nothing can be restored.
   - No Playwright / agent-browser / Chromium installs (huge download + RAM).
   - No parallel workers. Tasks small, self-contained, sequential.
   - Browser QA via the **Orca embedded browser** — read the orca-cli skill
     `references/browser.md` BEFORE driving a tab (not in context after compaction).
   - If anything looks heavy, stop and report.
3. TypeScript strict, vanilla DOM, no framework, no CDN. Vite `base: '/2048/'`
   must stay (GitHub Pages sub-path).

## Status (as of 2026-09-23 — ALL WORK DONE, pending user phone acceptance)

- [x] Full source read + code review (code-reviewer + typescript-reviewer rubrics).
- [x] Repo registered in Orca — Orca worktrees for this repo are now possible.
- [x] Apply fixes (ordered list below) — all 7 fixes implemented + unit-tested.
- [x] `npm test` + `npm run build` green — **52/52** tests; build green.
- [x] Commit + push to `main` — via `land-branch.sh` (final land commit
  `c977348`, branch deleted). Direct commits/pushes to `main` are **blocked**
  by the pre-tool-use guard; always land via `land-branch.sh`.
- [x] Workflow "Deploy to GitHub Pages" green — run #35814000678
  (headSha `c977348`, success, 2026-09-23T03:21:30Z).
- [x] Browser QA against the deployed site; fill docs/QA-STATUS.md — **PASS**
  (layout, mechanics, animations, 320/360/393px responsive, a11y, console).
- [ ] Report to user: URL + QA summary — **the only remaining step**.

**Current git state:** `main` at `c977348` = `origin/main`; `2048-game` branch
deleted. Screenshot: `docs/qascreenshots/desktop.png`.

## Review findings

### Must fix — functional bugs
1. **Touch buttons dead on touch devices.** `src/ui/input.ts`, `onTouchStart`:
   `e.preventDefault()` on the whole `#game` root suppresses the synthetic `click`
   on "New Game" / "Keep going" → overlay buttons never fire on a phone.
   - Fix: only preventDefault/track when the touch target is the board
     (`if (!e.target.closest('.board-wrap')) return;`), or attach listeners to
     the board area only. The board already has `touch-action: none`.
   - jsdom test: touchstart on a button + subsequent click → handler still fires.
2. **Keyboard auto-repeat.** Held arrow fires ~25–40 moves/sec (OS repeat),
   score runaway on desktop. Add cooldown: ignore direction events within ~150ms
   of the last accepted one (`lastMoveAt` timestamp). Update DESIGN.md note
   "key auto-repeat allowed" to match.
3. **Header wraps on narrow screens.** `.header h1 { font-size: 48px }` fixed
   → title wraps on ≤~330px. Use `clamp(30px, 9vw, 48px)`; verify h1 one line
   at 320–360px via JS eval (`clientHeight` ≈ single line height).

### Should fix — polish (biggest quality jump)
4. **Tile animations.** `src/ui/anim.ts` is a **broken WIP stub, committed on
   purpose — finish it, don't delete it** (shape is right: `CellAnim { from,
   merged, spawn }`, `computeCellAnims(prev, next, dir)` skeleton, but body is
   half-written garbage with a dangling `for (const i of tiles)`).
   - Implement `computeCellAnims`: for each line (in slide order, see `lines()`
     in engine.ts), match new tiles back to prev positions (same value), mark
     `merged` (value = 2× the source), `spawn` (2/4 appearing in a prev-empty
     cell), `from` = source index. No-op ⇒ all null/false.
   - Wire into `src/ui/render.ts` with **stable DOM cells**: build 16 cells once;
     on state change update each cell's text/class and add CSS animation
     classes (slide / merge-pulse / spawn-pop) instead of `root.replaceChildren()`
     (flicker + lost focus).
   - Add `@keyframes` + 200–300ms durations to styles.css.
   - Unit test `computeCellAnims`: left `[2,2,4,8]→[4,4,8,0]` ⇒ index 0 merged;
     spawn into a fresh empty cell; no-op ⇒ all nulls.
5. **index.html**: add `<meta name="theme-color" content="#bbada0">`.
   (viewport meta already present ✓, no CDN ✓.)
6. **Micro-a11y**: `type="button"` on both buttons; `aria-live="polite"` on the
   score box; visible `:focus-visible` outline.

### Confirmed OK — do not "fix"
- Engine matches DESIGN.md: slideRow merges at most once per move
  (`[2,2,4,8]→[4,4,8,0]`), no-op returns SAME state reference, does not
  consume rng, 90/10 2/4 spawn, `won` sticky on 2048,
  `over = !canMove(newState)`, `canMove` = empty cell or equal adjacent pair.
- Vite base, strict TS, test setup, Pages workflow — all fine.

## QA plan (Orca embedded browser only — no heavy installs)

Read orca-cli skill `references/browser.md` first (navigation, snapshot, refs,
screenshot). Checklist: docs/QA-STATUS.md.
1. **Load** — board + 2 tiles + score 0.
   `eval`: `document.documentElement.scrollWidth <= window.innerWidth`.
2. **Layout** — `getBoundingClientRect()` for `.header h1`, `.board`, `#game`;
   h1 one line, board square, nothing clipped.
3. **Mechanics** — arrow keys (if the embedded browser forwards them): several
   moves → board changed, score delta = merged value(s); at least one no-op →
   score unchanged.
4. **Overlays** (win / game-over) — deployed build doesn't expose state, so
   cover with **render unit tests** (jsdom is already a devDependency):
   `render({over:true})` → "Game over!" + New Game button;
   `render({won:true, keepPlaying:false})` → "You win!" + Keep going;
   `keepPlaying:true` → no overlay; each button dispatches its callback.
   Optional only — ask the user first: DEV-only `window.__GAME__` handle to
   force overlays in a real browser.
5. **Animations** — after a move,
   `getComputedStyle(cell).animationName` non-empty for slide/merge/spawn tiles.
6. Record every check in docs/QA-STATUS.md: result, numbers, timestamp,
   screenshot paths.

Final acceptance = user opens the URL on a phone and swipes.

## Deploy + git
- All work goes to `main` (local `2048-game` is stale; FF it after).
- `git push origin main` triggers "Deploy to GitHub Pages" (`npm ci`,
  `npm test`, `npm run build`, upload `dist/`).
- Verify green: `gh run list --limit 5 --json name,conclusion,startedAt,completedAt`.
- Then `curl -sI https://anton-trautman.github.io/2048/` → 200.

## Current state + actions for a next session

Work is **complete** as of 2026-09-23. If you land in a fresh session:

1. **User phone acceptance** — the user opens
   https://anton-trautman.github.io/2048/ and swipes. If they report anything
   off, fix it and land via `land-branch.sh`.
2. **Optional polish (only on request):** DEV-only `window.__GAME__` handle
   to force the win / game-over overlays in a real browser (the deployed build
   keeps state private; overlays are fully covered by render tests).
3. **If code changes are needed:** verify green baseline
   (`npm test && npm run build`), work on a feature branch, land with
   `land-branch.sh`.

Done = user confirms the phone check.
