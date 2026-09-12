import { describe, expect, it } from 'vitest';
import {
  canMove,
  createGameState,
  emptyCells,
  newGame,
  slideRow,
  spawnTile,
} from './engine';
import { createRng, randomSeed, type Rng } from './rng';
import type { Board, Direction } from './types';

const board = (tiles: [number, number][]) => {
  const b = Array<number>(16).fill(0);
  for (const [i, v] of tiles) b[i] = v;
  return b as Board;
};

// Deterministic fake rng: value from the sequence, index choice from it too.
const seqRng = (values: number[]) => {
  let i = 0;
  let calls = 0;
  const rng = () => {
    calls++;
    return values[Math.min(i++, values.length - 1)];
  };
  rng.calls = () => calls;
  return rng;
};

describe('slideRow', () => {
  it('slides and merges both ends', () => {
    expect(slideRow([8, 0, 0, 8])).toEqual([
      [16, 0, 0, 0],
      16,
    ]);
  });

  it('merges left-to-right, one merge per tile: [2,2,4,8] -> [4,4,8,0]', () => {
    expect(slideRow([2, 2, 4, 8])).toEqual([
      [4, 4, 8, 0],
      4,
    ]);
  });

  it('double pair: [2,2,2,2] -> [4,4,0,0], gained 8', () => {
    expect(slideRow([2, 2, 2, 2])).toEqual([
      [4, 4, 0, 0],
      8,
    ]);
  });

  it('[4,4,8,8] -> [8,16,0,0], gained 24 (products lock, originals may merge)', () => {
    expect(slideRow([4, 4, 8, 8])).toEqual([
      [8, 16, 0, 0],
      24,
    ]);
  });

  it('no-op row gains 0 and is unchanged', () => {
    expect(slideRow([1, 2, 4, 8])).toEqual([
      [1, 2, 4, 8],
      0,
    ]);
  });

  it('all-zeros row stays zeros', () => {
    expect(slideRow([0, 0, 0, 0])).toEqual([[0, 0, 0, 0], 0]);
  });
});

describe('newGame', () => {
  it('has exactly two tiles, each 2 or 4, score 0, flags false', () => {
    const state = newGame(createRng(42));
    const nonZero = state.board.filter(v => v !== 0);
    expect(nonZero).toHaveLength(2);
    for (const v of nonZero) expect([2, 4]).toContain(v);
    expect(state.score).toBe(0);
    expect(state.won).toBe(false);
    expect(state.over).toBe(false);
    expect(state.keepPlaying).toBe(false);
  });
});

describe('move', () => {
  it('left: merges row 0 and slides row 3', () => {
    const s = createGameState(board([[0, 2], [1, 2], [15, 2]]));
    const r = move0(s, 'left', seqRng([0.01, 0.01])); // spawn in first empty, value 2
    expect(r.moved).toBe(true);
    expect(r.gained).toBe(4);
    expect(r.state.board[0]).toBe(4);
    expect(r.state.board[1]).toBe(2); // spawned in first empty cell (idx 1)
    expect(r.state.board[2]).toBe(0);
    expect(r.state.board[12]).toBe(2); // row 3's tile slid left
    expect(r.state.board[15]).toBe(0);
    expect(r.state.score).toBe(4);
  });

  it('right: [2,0,0,2] -> [0,0,0,4]', () => {
    const s = createGameState(board([[0, 2], [3, 2]]));
    const r = move0(s, 'right', seqRng([0.99, 0.99])); // spawn in last empty
    expect(r.moved).toBe(true);
    expect(r.gained).toBe(4);
    expect(r.state.board.slice(0, 4)).toEqual([0, 0, 0, 4]);
  });

  it('up: column 0 [2,0,0,2] -> [4,0,0,0]', () => {
    const s = createGameState(board([[0, 2], [4, 2]]));
    const r = move0(s, 'up', seqRng([0.99, 0.99]));
    expect(r.moved).toBe(true);
    expect(r.gained).toBe(4);
    expect(r.state.board[0]).toBe(4);
    expect(r.state.board[4]).toBe(0);
    expect(r.state.board[8]).toBe(0);
    expect(r.state.board[12]).toBe(0);
  });

  it('down: column 0 [2,0,0,2] -> [0,0,0,4]', () => {
    const s = createGameState(board([[0, 2], [12, 2]]));
    const r = move0(s, 'down', seqRng([0.99, 0.99]));
    expect(r.moved).toBe(true);
    expect(r.gained).toBe(4);
    expect(r.state.board[0]).toBe(0);
    expect(r.state.board[12]).toBe(4);
  });

  it('no-op: moved false, SAME state reference, rng untouched', () => {
    const s = createGameState(
      board([
        [0, 1], [1, 2], [2, 4], [3, 8],
        [4, 4], [5, 8], [6, 1], [7, 2],
        [8, 2], [9, 4], [10, 8], [11, 1],
        [12, 8], [13, 1], [14, 2], [15, 4],
      ]), // full Latin square: no equal neighbors anywhere
    );
    const rng = seqRng([0.5]);
    const r = move0(s, 'left', rng);
    expect(r.moved).toBe(false);
    expect(r.state).toBe(s);
    expect(r.gained).toBe(0);
    expect(rng.calls()).toBe(0);
  });

  it('success spawns exactly one tile and bumps score by gained', () => {
    const s = createGameState(board([[0, 2], [1, 2]]));
    const rng = seqRng([0, 0.1]); // spawn in first empty cell, value 2
    const r = move0(s, 'left', rng);
    expect(r.moved).toBe(true);
    // merge removes one tile, spawn adds one: net count stays 2
    expect(r.state.board.filter(v => v !== 0)).toHaveLength(2);
    expect(r.state.board[1]).toBe(2);
    expect(r.gained).toBe(4);
    expect(r.state.score).toBe(s.score + r.gained);
  });

  it('sets won on first 2048 and it is sticky', () => {
    let s = createGameState(board([[0, 1024], [1, 1024]]), 0, false, false, true);
    let r = move0(s, 'left');
    expect(r.state.won).toBe(true);
    s = r.state;
    r = move0(s, 'left'); // [2048,0,0,0,...] left is a no-op
    if (r.moved) {
      expect(r.state.won).toBe(true);
    } else {
      expect(s.won).toBe(true);
    }
  });

  it('full board with no equal neighbors: canMove false, move is a no-op', () => {
    const s = createGameState(
      board([
        [0, 1], [1, 2], [2, 4], [3, 8],
        [4, 4], [5, 8], [6, 1], [7, 2],
        [8, 2], [9, 4], [10, 8], [11, 1],
        [12, 8], [13, 1], [14, 2], [15, 4],
      ]),
    );
    expect(canMove(s)).toBe(false);
    const r = move0(s, 'up');
    expect(r.moved).toBe(false);
    expect(s.over).toBe(false); // over is only set on a successful move per design
  });

  it('sets over when a successful move leaves no moves', () => {
    // row 0 slides [1,0,4,8] -> [1,4,8,0]; spawn 4 in idx 3 -> full Latin square
    const s = createGameState(
      board([
        [0, 1], [2, 4], [3, 8],
        [4, 4], [5, 8], [6, 1], [7, 2],
        [8, 2], [9, 4], [10, 8], [11, 1],
        [12, 8], [13, 1], [14, 2], [15, 4],
      ]),
    );
    const r = move0(s, 'left', seqRng([0, 0.95])); // spawn in only empty cell, value 4
    expect(r.moved).toBe(true);
    expect(r.state.over).toBe(true);
  });

  it('determinism: same seed + same direction sequence -> identical states', () => {
    const dirs: Direction[] = ['left', 'up', 'right', 'down', 'left', 'up'];
    const run = () => {
      const rng = createRng(7);
      let s = newGame(rng);
      for (const d of dirs) {
        const r = move0(s, d, rng);
        if (r.moved) s = r.state;
      }
      return s;
    };
    const a = run();
    const b = run();
    expect(a.board).toEqual(b.board);
    expect(a.score).toBe(b.score);
    expect(a.won).toBe(b.won);
    expect(a.over).toBe(b.over);
  });
});

// move with a default deterministic rng unless the test provides one
import { move } from './engine';
function move0(
  state: ReturnType<typeof createGameState>,
  dir: Direction,
  rng: Rng = createRng(1),
) {
  return move(state, dir, rng);
}

describe('spawnTile / emptyCells', () => {
  it('spawnTile at index keeps other cells', () => {
    const b = board([[1, 2]]);
    const out = spawnTile(b, 2, createRng(1));
    expect(out[1]).toBe(2);
    expect(out[2]).toBeGreaterThanOrEqual(2);
    expect(b[2]).toBe(0); // original untouched
  });

  it('emptyCells lists zero indices', () => {
    expect(emptyCells(board([[0, 2], [15, 4]]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });
});

describe('rng', () => {
  it('same seed -> identical sequence', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('outputs in [0,1)', () => {
    const r = createRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randomSeed in [0, 2^32)', () => {
    for (let i = 0; i < 100; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(2 ** 32);
    }
  });
});
