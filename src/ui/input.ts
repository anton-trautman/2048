import type { Direction } from '../game/types';

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};

const SWIPE_THRESHOLD = 30;

export function bindInput(el: HTMLElement, onDirection: (d: Direction) => void): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    const dir = KEY_MAP[e.key];
    if (!dir) return;
    if (e.key.startsWith('Arrow')) e.preventDefault(); // arrows scroll the page
    onDirection(dir);
  };
  document.addEventListener('keydown', onKeyDown);

  let tracking = false;
  let sx = 0;
  let sy = 0;
  const onTouchStart = (e: TouchEvent) => {
    e.preventDefault(); // block scroll/zoom while playing
    const t = e.touches[0];
    if (!t) return;
    sx = t.clientX;
    sy = t.clientY;
    tracking = true;
  };
  const onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    onDirection(
      Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up'),
    );
  };
  const onTouchCancel = () => {
    tracking = false; // a stale position must never fire a move
  };
  el.addEventListener('touchstart', onTouchStart, { passive: false });
  el.addEventListener('touchend', onTouchEnd, { passive: false });
  el.addEventListener('touchcancel', onTouchCancel);

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('touchcancel', onTouchCancel);
  };
}