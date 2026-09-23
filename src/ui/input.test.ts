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
