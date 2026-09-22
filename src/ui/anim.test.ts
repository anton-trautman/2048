import { describe, expect, it } from 'vitest';
import { computeCellAnims } from './anim';

const B = (a: number[]) => a as readonly number[];

const zero = () =>
  B([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('computeCellAnims', () => {
  it('left: [2,2,4,8] -> [4,4,8,0]: first cell merged, 4/8 slide in place, no spawns', () => {
    const prev = B([2, 2, 4, 8, ...zero()]);
    const next = B([4, 4, 8, 0, ...zero()]);
    const anim = computeCellAnims(prev, next, 'left');
    expect(anim[0]).toEqual({ from: 0, merged: true, spawn: false });
    expect(anim[1]).toEqual({ from: 2, merged: false, spawn: false });
    expect(anim[2]).toEqual({ from: 3, merged: false, spawn: false });
    expect(anim[3]).toEqual({ from: null, merged: false, spawn: false });
  });

  it('left: [4,4,8,8] -> [8,16,0,0]: two independent merges', () => {
    const prev = B([4, 4, 8, 8, ...zero()]);
    const next = B([8, 16, 0, 0, ...zero()]);
    const anim = computeCellAnims(prev, next, 'left');
    expect(anim[0]).toEqual({ from: 0, merged: true, spawn: false });
    expect(anim[1]).toEqual({ from: 2, merged: true, spawn: false });
    expect(anim[2]).toEqual({ from: null, merged: false, spawn: false });
  });

  it('spawn: tile appears in a previously empty cell (2 at index 2, not from slide)', () => {
    // [2,2,0,0] left -> slide [4,0,0,0], spawn 2 into empty cell 2
    const prev = B([2, 2, 0, 0, ...zero()]);
    const next = B([4, 0, 2, 0, ...zero()]);
    const anim = computeCellAnims(prev, next, 'left');
    expect(anim[0]).toEqual({ from: 0, merged: true, spawn: false });
    expect(anim[2]).toEqual({ from: null, merged: false, spawn: true });
  });

  it('slide into an empty cell is not flagged as spawn (4 lands on index 1, spawn elsewhere)', () => {
    const prev = B([2, 0, 4, 0, ...zero()]);
    const next = B([2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0]); // spawn 2 at index 10
    const anim = computeCellAnims(prev, next, 'left');
    expect(anim[0]).toEqual({ from: 0, merged: false, spawn: false });
    expect(anim[1]).toEqual({ from: 2, merged: false, spawn: false });
    expect(anim[10]).toEqual({ from: null, merged: false, spawn: true });
  });

  it('up: column merges with spawn into a fresh empty cell', () => {
    const prev = B([2, 2, 0, 0, 2, 2, 0, 0, ...zero()]);
    const next = B([4, 4, 0, 0, 0, 0, 0, 0, 2, ...zero()]);
    const anim = computeCellAnims(prev, next, 'up');
    expect(anim[0]).toEqual({ from: 0, merged: true, spawn: false });
    expect(anim[1]).toEqual({ from: 1, merged: true, spawn: false });
    expect(anim[4]).toEqual({ from: null, merged: false, spawn: false });
    expect(anim[8]).toEqual({ from: null, merged: false, spawn: true });
  });

  it('right: [8,8,4,2] -> [0,16,4,2]', () => {
    const prev = B([8, 8, 4, 2, ...zero()]);
    const next = B([0, 16, 4, 2, ...zero()]);
    const anim = computeCellAnims(prev, next, 'right');
    expect(anim[1]).toEqual({ from: 1, merged: true, spawn: false });
    expect(anim[2]).toEqual({ from: 2, merged: false, spawn: false });
    expect(anim[3]).toEqual({ from: 3, merged: false, spawn: false });
  });

  it('down: col 0 [0,0,0,2,2] -> 4 merges into index 12 (bottom)', () => {
    const prev = B([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0]);
    const next = B([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0]);
    const anim = computeCellAnims(prev, next, 'down');
    expect(anim[12]).toEqual({ from: 12, merged: true, spawn: false });
    expect(anim[0]).toEqual({ from: null, merged: false, spawn: false });
    expect(anim[4]).toEqual({ from: null, merged: false, spawn: false });
    expect(anim[8]).toEqual({ from: null, merged: false, spawn: false });
  });

  it('no-op: packed board unchanged -> from equals each tile\'s own index, nothing animated', () => {
    const prev = B([2, 4, 8, 16, 32, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const anim = computeCellAnims(prev, prev, 'left');
    expect(anim[0]).toEqual({ from: 0, merged: false, spawn: false });
    expect(anim[1]).toEqual({ from: 1, merged: false, spawn: false });
    expect(anim[2]).toEqual({ from: 2, merged: false, spawn: false });
    expect(anim[3]).toEqual({ from: 3, merged: false, spawn: false });
    expect(anim[4]).toEqual({ from: 4, merged: false, spawn: false });
    expect(anim[5]).toEqual({ from: 5, merged: false, spawn: false });
  });
});
