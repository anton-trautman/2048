import { describe, expect, it, vi } from 'vitest';
import { render } from './render';
import type { GameState } from '../game/types';

function makeState(
  board: number[],
  opts: { score?: number; over?: boolean; won?: boolean; keepPlaying?: boolean } = {},
): GameState {
  const b = [...board];
  while (b.length < 16) b.push(0);
  return {
    board: b,
    score: opts.score ?? 0,
    won: opts.won ?? false,
    over: opts.over ?? false,
    keepPlaying: opts.keepPlaying ?? false,
  };
}

function makeRoot(): HTMLElement {
  const root = document.createElement('div');
  root.id = 'game';
  document.body.appendChild(root);
  return root;
}

function cellsOf(root: HTMLElement): HTMLDivElement[] {
  return Array.from(root.querySelectorAll('.board .cell'));
}

describe('render layout', () => {
  it('builds a header with title/score and a stable 16-cell board', () => {
    const root = makeRoot();
    render(root, makeState([2, 2]), vi.fn(), vi.fn());
    const cells = cellsOf(root);
    expect(cells).toHaveLength(16);
    expect(cells[0]!.textContent).toBe('2');
    expect(cells[1]!.textContent).toBe('2');
    expect(cells[2]!.textContent).toBe('0');
    expect(root.querySelector('.header h1')?.textContent).toBe('2048');
    expect(root.querySelector('.score-value')?.textContent).toBe('0');
    expect(root.querySelector('.score-box')!.getAttribute('aria-live')).toBe('polite');
    expect(root.querySelector('header button')!.getAttribute('type')).toBe('button');
  });

  it('re-renders in place: same cell elements, updated text and score', () => {
    const root = makeRoot();
    render(root, makeState([2, 4, 8], { score: 0 }), vi.fn(), vi.fn());
    const a = cellsOf(root);
    render(root, makeState([4, 8, 16], { score: 12 }), vi.fn(), vi.fn());
    const b = cellsOf(root);
    for (let i = 0; i < 16; i++) expect(a[i]).toBe(b[i]); // same DOM nodes
    expect(b[0]!.textContent).toBe('4');
    expect(b[1]!.textContent).toBe('8');
    expect(root.querySelector('.score-value')!.textContent).toBe('12');
  });

  it('updates tile classes for new values (including tile-super and digit sizing)', () => {
    const root = makeRoot();
    render(root, makeState([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2048]), vi.fn(), vi.fn());
    const cells = cellsOf(root);
    expect(cells[0]!.classList.contains('tile-2')).toBe(true);
    expect(cells[0]!.textContent).toBe('2');
    expect(cells[15]!.classList.contains('tile-2048')).toBe(true);
    render(root, makeState([4096]), vi.fn(), vi.fn());
    expect(cells[0]!.classList.contains('tile-super')).toBe(true);
    expect(cells[0]!.classList.contains('digits-4')).toBe(true);
  });
});

describe('render overlay', () => {
  it('is hidden by default and on a normal state', () => {
    const root = makeRoot();
    render(root, makeState([2, 2, 2, 2]), vi.fn(), vi.fn());
    const overlay = root.querySelector('.overlay')!;
    expect(overlay.hasAttribute('hidden')).toBe(true);
  });

  it('shows "Game over!" with a New Game button when over', () => {
    const root = makeRoot();
    render(root, makeState([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]), vi.fn(), vi.fn());
    // a packed board is a reasonable over-ish fixture; force over explicitly:
    render(root, makeState([2], { over: true }), vi.fn(), vi.fn());
    const overlay = root.querySelector('.overlay')!;
    expect(overlay.hasAttribute('hidden')).toBe(false);
    expect(overlay.querySelector('.overlay-text')!.textContent).toBe('Game over!');
    const btn = overlay.querySelector('button')! as HTMLButtonElement;
    expect(btn).toBeInstanceOf(HTMLButtonElement);
    expect(btn.textContent).toBe('New Game');
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('shows "You win!" with Keep going when won and !keepPlaying', () => {
    const root = makeRoot();
    render(root, makeState([2], { won: true }), vi.fn(), vi.fn());
    const overlay = root.querySelector('.overlay')!;
    expect(overlay.hasAttribute('hidden')).toBe(false);
    expect(overlay.querySelector('.overlay-text')!.textContent).toBe('You win!');
    const btn = overlay.querySelector('button')! as HTMLButtonElement;
    expect(btn.textContent).toBe('Keep going');
  });

  it('stays hidden when won + keepPlaying (keep playing after the win)', () => {
    const root = makeRoot();
    render(root, makeState([2], { won: true, keepPlaying: true }), vi.fn(), vi.fn());
    expect(root.querySelector('.overlay')!.hasAttribute('hidden')).toBe(true);
  });

  it('over takes precedence over won (game over wins)', () => {
    const root = makeRoot();
    render(root, makeState([2], { won: true, over: true }), vi.fn(), vi.fn());
    const overlay = root.querySelector('.overlay')!;
    expect(overlay.hasAttribute('hidden')).toBe(false);
    expect(overlay.querySelector('.overlay-text')!.textContent).toBe('Game over!');
    expect(overlay.querySelector('button')!.textContent).toBe('New Game');
  });

  it('is the same persistent element that flips content across states', () => {
    const root = makeRoot();
    render(root, makeState([2]), vi.fn(), vi.fn());
    render(root, makeState([2], { won: true }), vi.fn(), vi.fn());
    const overlay1 = root.querySelector('.overlay')!;
    render(root, makeState([2], { won: true, keepPlaying: true }), vi.fn(), vi.fn());
    const overlay2 = root.querySelector('.overlay')!;
    expect(overlay1).toBe(overlay2);
  });
});

describe('render button callbacks', () => {
  it('header New Game fires the latest onNewGame callback', () => {
    const root = makeRoot();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    render(root, makeState([2]), cb1, vi.fn());
    render(root, makeState([2]), cb2, vi.fn());
    (root.querySelector('header button') as HTMLButtonElement).click();
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('overlay button fires the callback matching the shown overlay, per click', () => {
    const root = makeRoot();
    const onNewGame = vi.fn();
    const onKeepPlaying = vi.fn();

    render(root, makeState([2], { over: true }), onNewGame, onKeepPlaying);
    const btn = root.querySelector('.overlay button')! as HTMLButtonElement;
    btn.click();
    expect(onNewGame).toHaveBeenCalledTimes(1);
    expect(onKeepPlaying).not.toHaveBeenCalled();

    render(root, makeState([2], { won: true }), onNewGame, onKeepPlaying);
    btn.click();
    expect(onKeepPlaying).toHaveBeenCalledTimes(1);
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });

  it('a callback that changed between renders is not called on a stale click', () => {
    const root = makeRoot();
    const oldCb = vi.fn();
    const newCb = vi.fn();
    render(root, makeState([2], { won: true }), vi.fn(), oldCb);
    const btn = root.querySelector('.overlay button')! as HTMLButtonElement;
    render(root, makeState([2], { won: true, keepPlaying: true }), vi.fn(), newCb);
    btn.click();
    expect(oldCb).not.toHaveBeenCalled();
  });
});

describe('render tile animations', () => {
  it('no dir (new-game / reset render) applies no animation classes', () => {
    const root = makeRoot();
    const cb = vi.fn();
    render(root, makeState([2, 4]), cb, cb);
    const cells = cellsOf(root);
    render(root, makeState([4, 8]), cb, cb);
    for (const c of cells) {
      expect(c.classList.contains('tile-slide')).toBe(false);
      expect(c.classList.contains('tile-merged')).toBe(false);
      expect(c.classList.contains('tile-spawn')).toBe(false);
    }
  });

  it('left move [2,2,4,8] + spawn -> merge at 0, slides 4/8, spawn pops', () => {
    const root = makeRoot();
    const cb = vi.fn();
    const prev = makeState([2, 2, 4, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    render(root, prev, cb, cb);
    const next = makeState([4, 4, 8, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0]);
    render(root, next, cb, cb, 'left');
    const cells = cellsOf(root);
    expect(cells[0]!.textContent).toBe('4');
    expect(cells[0]!.classList.contains('tile-merged')).toBe(true);
    expect(cells[0]!.classList.contains('tile-slide')).toBe(false);
    expect(cells[1]!.textContent).toBe('4');
    expect(cells[1]!.classList.contains('tile-slide')).toBe(true);
    expect(cells[1]!.classList.contains('tile-merged')).toBe(false);
    expect(cells[2]!.textContent).toBe('8');
    expect(cells[2]!.classList.contains('tile-slide')).toBe(true);
    expect(cells[3]!.textContent).toBe('0');
    expect(cells[3]!.classList.contains('tile-spawn')).toBe(false);
    expect(cells[10]!.textContent).toBe('2');
    expect(cells[10]!.classList.contains('tile-spawn')).toBe(true);
    expect(cells[10]!.classList.contains('tile-slide')).toBe(false);
  });

  it('sets --slide-dx/--slide-dy slide offsets on sliding cells (0 in jsdom)', () => {
    const root = makeRoot();
    const cb = vi.fn();
    render(root, makeState([2, 2, 4, 8]), cb, cb);
    render(root, makeState([4, 4, 8, 0], { score: 4 }), cb, cb, 'left');
    const cells = cellsOf(root);
    const c1 = cells[1]!; // slid from index 2
    expect(c1!.style.getPropertyValue('--slide-dx')).toBe('0px');
    expect(c1!.style.getPropertyValue('--slide-dy')).toBe('0px');
    const c0 = cells[0]!; // merged, not sliding
    expect(c0!.style.getPropertyValue('--slide-dx')).toBe('');
  });

  it('spawned tiles are never flagged as slides', () => {
    const root = makeRoot();
    const cb = vi.fn();
    render(root, makeState([2, 0, 4, 0]), cb, cb);
    // slide-left: 4 -> index 1; spawn 2 at index 3 (previously empty)
    render(root, makeState([2, 4, 0, 2]), cb, cb, 'left');
    const cells = cellsOf(root);
    expect(cells[1]!.classList.contains('tile-slide')).toBe(true);
    expect(cells[3]!.classList.contains('tile-spawn')).toBe(true);
    expect(cells[3]!.classList.contains('tile-slide')).toBe(false);
  });
});
