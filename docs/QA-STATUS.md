# QA Status — 2048 @ https://anton-trautman.github.io/2048/

Fill as you go; final state = acceptance evidence for the user.
- Date / session:
- Deploy commit (must be on origin/main):
- Workflow run (expect: success):

## Pre-deploy (local)
- [ ] `npm test` green:
- [ ] `npm run build` green; `dist/index.html` asset URLs carry `/2048/` prefix:

## Post-deploy (Orca embedded browser)
- [ ] Load: board + 2 tiles + score 0 visible
- [ ] No horizontal scroll: `document.documentElement.scrollWidth <= innerWidth`
- [ ] Layout (h1 one line, board square, nothing clipped; log bRects of `.header h1`, `.board`, `#game`):
- [ ] Keyboard: 4 directions move correctly; score delta = merged value(s)
- [ ] Keyboard: rapid repeat is throttled (no score runaway)
- [ ] Keyboard: no-op move leaves score unchanged
- [ ] Animations: `getComputedStyle(cell).animationName` non-empty for moved/merged/spawned tiles
- [ ] Overlays via render unit tests (jsdom): game-over ✓ / win + Keep going ✓ / dismissed ✓
- [ ] Buttons dispatch on touch (jsdom test): New Game ✓ / Keep going ✓
- [ ] Screenshots (paths):

## Verdict
- Overall:
- What the user should check on the phone:
