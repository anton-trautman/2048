# QA Status — 2048 @ https://anton-trautman.github.io/2048/

- **Date / session:** 2026-09-23 — full Orca browser QA pass
- **Deploy commit (on origin/main):** `c977348` "fix(ui): touch, keyboard repeat, h1 clamp, a11y, tile animations"
- **Workflow run (Deploy to GitHub Pages):** #35814000678 — **success**, started 2026-09-23T03:21:30Z, headSha `c977348a3fc5a5f77d96c8d711e369e63593e2d5`

## Pre-deploy (local)

- [x] `npm test` green: **52/52** (4 files — 22 engine, 8 anim, 6 input, 16 render)
- [x] `npm run build` green (tsc + vite). `dist/index.html` + hashed assets; site
      loads at `/2048/` with the `/2048/` asset prefix (page renders in Orca
      and on the live site — confirmed 200 + full UI).
- [x] `git log`: `993e0b1` → `fc2d1c9` (anim.ts build fix) → `c977348` (7 fixes).
      All commits Conventional Commits, ≤72-char subjects.

## Post-deploy (Orca embedded browser)

Tool note: Orca's `orca keypress` does **not** reach the embedded page (tab
focus stays in Orca). Keyboard checks used `document.dispatchEvent(new
KeyboardEvent(...))` — same `document`-level handler the real keys hit.
Real-key and real-touch acceptance is the user's phone check below.

- [x] Load: board + 2 tiles + score 0 visible (snapshot: h1 "2048",
      "New Game" button, SCORE 0, 16 cells, 2 non-zero).
- [x] No horizontal scroll: desktop `scrollWidth` 1111 `<=` innerWidth 1111;
      `<= 320` in 320/360px iframe checks; `<= 393` in iPhone 15 mode.
- [x] Layout:
      - Desktop: `.header h1` box 123.9×56.5, `clientHeight == scrollHeight`
        (one line); `.board` 420×420 square; `#game` at 345.5,0 / 420×1018,
        not clipped.
      - 320px (real, same-origin iframe, `vw` resolves to 320): h1 font **30px**
        = clamp(30, 9vw=28.8, 48) floor, **one line** (78×35.5), board
        288×288 square, no hscroll, not clipped.
      - 360px (real, same-origin iframe): h1 font **32.4px** (9vw), one line,
        board 324×324 square, no hscroll.
      - 393px (real, iPhone 15 device emulation): h1 font **35.37px** (9vw),
        one line, board 353.7×353.7 square, no hscroll.
- [x] Keyboard (4 directions):
      - **Merge move:** board `[·,2,2,·,·,·,2,·]` +Left → `[·,4,·,·, 4,0,0,0]`
        pattern, score 0 → **4** (delta = merged value).
      - **Slide move:** +Right → tiles moved to right edge, score unchanged.
      - **No-op:** +Left on a fully left-compact board → board **and** score
        unchanged (8 → 8).
      - **Auto-repeat throttle:** unit tests — 3 keydowns 100 ms apart → 1
        move; 5 keydowns 500 ms apart → 5 moves (KEY_REPEAT_MS = 150).
- [x] Animations: `getComputedStyle(cell).animationName` non-empty during the
      animation window:
      - `tile-merged` on the merged cell (4 from 2+2),
      - `tile-spawn` on the spawned 2,
      - `tile-slide` on 3 sliding tiles (values 4, 4, 2).
      Durations: slide 250 ms, merged/spawn 300 ms (styles.css).
- [x] Overlays (jsdom render tests):
      - game-over → "Game over!" + New Game button;
      - win + keepPlaying false → "You win!" + Keep going;
      - keepPlaying true → no overlay;
      - each button dispatches its callback; stale clicks after a state
        change fire the *current* callback (hidden overlay button is a no-op).
- [x] Buttons dispatch on touch (jsdom tests): `preventDefault` fires only
      when the touch starts on `.board`, so the synthetic `click` on
      "New Game"/"Keep going" still fires on phones. Header button also
      verified with a real browser click (score → 0, two fresh tiles).
- [x] `:focus-visible`: focused "New Game" button shows a **3px** outline
      (`outlineWidth: 3px`) after a real click.
- [x] Console: **no JS errors** across ~10 moves + reload + resets.
- [x] `theme-color` meta `#bbada0` present in the deployed HTML.
- [x] Screenshots: `docs/qascreenshots/desktop.png`.
      Mobile capture timed out in device-EMU mode (CDP capture needs a visible
      window); the 320/360/393px layout numbers above are the mobile evidence,
      and the user's phone check is final acceptance.

## Verdict

- **Overall: PASS** — all 7 handoff fixes verified on the deployed site
  (`c977348`). 52/52 tests, build green, CI green.
- **What the user should check on the phone:**
  1. Open https://anton-trautman.github.io/2048/ — board + score visible,
     title on one line, no horizontal scroll.
  2. **Swipe** left/right/up/down (board only) — tiles slide, merge, and
     animate; score increments only on merges.
  3. Tap **New Game** — resets to score 0 with two 2-tiles.
  4. Reach 2048 → "You win!" with **Keep going**; dead-end board → "Game
     over!" with **New Game** (overlays are unit-tested; if either is
     ever unreachable on the phone, that's the one thing to report back).

## Caveats / known limits (Orca embedded browser)

- `orca keypress` doesn't forward to the page → keyboard checked via
  synthetic `keydown` on the same `document` handler.
- No arbitrary viewport; 320–360px verified with same-origin iframes
  (`vw` units behave identically), 393px with iPhone 15 emulation.
- Win / game-over overlays can't be forced on the deployed build (state is
  not exposed). Optional: a DEV-only `window.__GAME__` handle to force both
  overlays in a real browser — ask before adding.
