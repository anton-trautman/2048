# 2048

A mobile-first, classic-look 2048 in TypeScript. Playable with touch swipes
(plus arrow keys / WASD on desktop). No framework, no backend, no external
assets.

Live: https://anton-trautman.github.io/2048/

## Run it

```sh
npm install
npm run dev      # local dev server
npm test         # vitest (engine unit tests)
npm run build    # typecheck + build to dist/
```

## Architecture

See [DESIGN.md](DESIGN.md) for the full spec.

- `src/game/` — pure engine: `types.ts`, `rng.ts` (seedable Mulberry32),
  `engine.ts` (slide/merge/spawn/win/lose). No DOM, no globals; the RNG is
  injected, so games are fully deterministic per seed.
- `src/ui/` — `render.ts` (DOM), `input.ts` (keyboard + swipe), `game.ts`
  (glue). Never mutates state directly — only engine results.
- `src/main.ts` — sole composer.

## Hosting

Built with Vite `base: '/2048/'` so every asset URL resolves under the
GitHub Pages sub-path. Deploy `dist/` to the `gh-pages` branch (or point Pages
at it); the site serves at `https://anton-trautman.github.io/2048/`.