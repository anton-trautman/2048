import type { Board, Direction } from '../game/types';

/** Per-cell animation metadata describing how the tile in `next[cell]` got there. */
export interface CellAnim {
  /** Index in the *prev* board of the tile this cell's tile came from, or null. */
  from: number | null;
  /** This tile was produced by a merge (two equal tiles combined into it). */
  merged: boolean;
  /** This tile just spawned (fresh 2/4) in this cell. */
  spawn: boolean;
}

/**
 * Per-line index tuples, ordered in the slide direction, same layout as the
 * engine's `lines()` — so a cell's "from" index is a plain board index.
 */
function slideLines(dir: Direction): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let l = 0; l < 4; l++) {
    if (dir === 'left') out.push([l * 4, l * 4 + 1, l * 4 + 2, l * 4 + 3]);
    else if (dir === 'right') out.push([l * 4 + 3, l * 4 + 2, l * 4 + 1, l * 4]);
    else if (dir === 'up') out.push([l, l + 4, l + 8, l + 12]);
    else out.push([l + 12, l + 8, l + 4, l]);
  }
  return out;
}

/**
 * Trace the result of sliding `inp` (already in slide order) back to its
 * sources. Mirrors `engine.slideRow` exactly: compact zeros, merge left-to-
 * right (each tile at most once), pad with zeros. Every entry carries the
 * source position inside `inp` (null for a padded zero) and whether it
 * came out of a merge.
 */
function traceSlide(
  inp: readonly number[],
): { v: number; src: number | null; merged: boolean }[] {
  const live: { v: number; src: number }[] = [];
  for (let k = 0; k < inp.length; k++) {
    if (inp[k] !== 0) live.push({ v: inp[k], src: k });
  }
  const out: { v: number; src: number | null; merged: boolean }[] = [];
  let i = 0;
  while (i < live.length) {
    if (i + 1 < live.length && live[i].v === live[i + 1].v) {
      out.push({ v: live[i].v * 2, src: live[i].src, merged: true });
      i += 2;
    } else {
      out.push({ v: live[i].v, src: live[i].src, merged: false });
      i += 1;
    }
  }
  while (out.length < inp.length) out.push({ v: 0, src: null, merged: false });
  return out;
}

/**
 * Compute per-cell animation metadata for a move `prev` -> `next`.
 *
 * `next` is the engine's final board: the pure slide/merge result plus exactly
 * one freshly spawned tile. A cell that holds a tile in `next` where the
 * pure slide produced 0 is a spawn; every other non-zero cell traces back to
 * its source index in `prev`. No-op moves (prev === next) yield `from` equal
 * to the tile's own index and no spawn/merge flags.
 */
export function computeCellAnims(prev: Board, next: Board, dir: Direction): CellAnim[] {
  const out: CellAnim[] = Array.from({ length: 16 }, () => ({
    from: null,
    merged: false,
    spawn: false,
  }));

  for (const line of slideLines(dir)) {
    const trace = traceSlide([
      prev[line[0]],
      prev[line[1]],
      prev[line[2]],
      prev[line[3]],
    ]);
    for (let k = 0; k < 4; k++) {
      const cell = line[k];
      if (next[cell] === 0) continue; // empty cell: nothing to animate
      if (trace[k].v !== 0) {
        // Arrived via slide (possibly from a merge).
        const src = trace[k].src;
        out[cell] = {
          from: src === null ? null : line[src],
          merged: trace[k].merged,
          spawn: false,
        };
      } else {
        // Tile exists in `next` but the pure slide produced 0 here: it spawned.
        out[cell] = { from: null, merged: false, spawn: true };
      }
    }
  }

  return out;
}
