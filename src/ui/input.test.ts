import { describe, expect, it, vi } from 'vitest';
import { bindInput } from './input';

function makeRoot() {
  const root = document.createElement('div');
  root.id = 'game';
  const header = document.createElement('header');
  header.className = 'header';
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'New Game';
  const wrap = document.createElement('div');
  wrap.className = 'board-wrap';
  const board = document.createElement('div');
  board.className = 'board';
  const cell = document.createElement('div');
  cell.className = 'cell tile-0';
  board.append(cell);
  wrap.append(board);
  header.append(btn);
  root.append(header, wrap);
  document.body.appendChild(root);
  return { root, btn, board, cell };
}

// jsdom's TouchEvent has an empty `touches`/`changedTouches` list and no Touch
// constructor, so we shadow the getters with the coordinates we care about.
function touchStart(_target: HTMLElement, x: number, y: number) {
  const ev = new TouchEvent('touchstart', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'touches', {
    value: [{ clientX: x, clientY: y }],
    writable: true,
    configurable: true,
  });
  return ev;
}

function touchEnd(_target: HTMLElement, x: number, y: number) {
  const ev = new TouchEvent('touchend', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'changedTouches', {
    value: [{ clientX: x, clientY: y }],
    writable: true,
    configurable: true,
  });
  return ev;
}

describe('bindInput touch handling', () => {
  it('touch on a button does not preventDefault, so the synthetic click still fires', () => {
    const { root, btn } = makeRoot();
    bindInput(root, vi.fn());
    const start = touchStart(btn, 10, 10);
    btn.dispatchEvent(start);
    expect(start.defaultPrevented).toBe(false);
    const cb = vi.fn();
    btn.addEventListener('click', cb);
    btn.click();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('touch on the board is preventDefaulted (scroll/zoom blocked)', () => {
    const { root, cell } = makeRoot();
    bindInput(root, vi.fn());
    const start = touchStart(cell, 10, 10);
    cell.dispatchEvent(start);
    expect(start.defaultPrevented).toBe(true);
  });

  it('horizontal swipe on the board fires a direction; a tap fires nothing', () => {
    const { root, cell } = makeRoot();
    const onDirection = vi.fn();
    bindInput(root, onDirection);

    cell.dispatchEvent(touchStart(cell, 50, 50));
    cell.dispatchEvent(touchEnd(cell, 150, 50));
    expect(onDirection).toHaveBeenCalledTimes(1);
    expect(onDirection).toHaveBeenCalledWith('right');

    // tap (under SWIPE_THRESHOLD) fires nothing
    cell.dispatchEvent(touchStart(cell, 80, 80));
    cell.dispatchEvent(touchEnd(cell, 80, 80));
    expect(onDirection).toHaveBeenCalledTimes(1);
  });

  it('touchcancel clears tracking so a later stray touchend fires nothing', () => {
    const { root, cell } = makeRoot();
    const onDirection = vi.fn();
    bindInput(root, onDirection);
    cell.dispatchEvent(touchStart(cell, 50, 50));
    cell.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true }));
    cell.dispatchEvent(touchEnd(cell, 150, 50));
    expect(onDirection).not.toHaveBeenCalled();
  });
});

// jsdom's `performance` is not faked by vi.useFakeTimers(), so the keyboard
// tests drive a deterministic clock by spying on `performance.now()` instead.
function fakeNow() {
  return vi.spyOn(globalThis.performance, 'now').mockImplementation(() => now);
}

let now = 0;

describe('bindInput keyboard throttling', () => {
  it('throttles key auto-repeat to one move per 150 ms (held arrows)', () => {
    const { root } = makeRoot();
    const onDirection = vi.fn();
    bindInput(root, onDirection);
    const restore = fakeNow();
    const arrowUp = () =>
      root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    now = 0;
    arrowUp();
    expect(onDirection).toHaveBeenCalledTimes(1); // accepted
    now = 149;
    arrowUp();
    now = 149;
    arrowUp();
    expect(onDirection).toHaveBeenCalledTimes(1); // repeats within 150 ms swallowed

    now = 100; // still inside the 150 ms window
    arrowUp();
    expect(onDirection).toHaveBeenCalledTimes(1);

    now = 150; // exactly 150 ms since last accepted — accepted
    arrowUp();
    expect(onDirection).toHaveBeenCalledTimes(2);
    expect(onDirection).toHaveBeenLastCalledWith('up');

    now = 200; // 50 ms after the last accepted — throttled again
    arrowUp();
    expect(onDirection).toHaveBeenCalledTimes(2);
    restore.mockRestore();
  });

  it('throttles WASD auto-repeat the same way; non-move keys do not reset it', () => {
    const { root } = makeRoot();
    const onDirection = vi.fn();
    bindInput(root, onDirection);
    const restore = fakeNow();
    const key = (k: string) =>
      root.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

    now = 0;
    key('w'); // accepted (up)
    now = 100;
    key('w'); // within 150 ms → swallowed
    now = 140;
    key('W'); // within 150 ms → swallowed
    expect(onDirection).toHaveBeenCalledTimes(1);
    expect(onDirection).toHaveBeenLastCalledWith('up');

    now = 140;
    key('f'); // non-direction key: ignored, does not reset the throttle
    now = 149; // 149 ms since accepted 'w' — still throttled
    key('w');
    expect(onDirection).toHaveBeenCalledTimes(1);

    now = 150;
    key('w');
    expect(onDirection).toHaveBeenCalledTimes(2);
    expect(onDirection).toHaveBeenLastCalledWith('up');
    restore.mockRestore();
  });
});
