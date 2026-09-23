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
    // Only swipes that start on the board are captured. Touches on the header
    // or overlay buttons must not be preventDefault'd or tracked, or the
    // synthetic "click" on "New Game"/"Keep going" is swallowed on phones.
    if (!(e.target as HTMLElement).closest('.board')) return;
    e.preventDefault(); // block scroll/zoom while playing
    const t = e.touches[0];
    if (!t) return;
    sx = t.clientX;
    sy = t.clientY;
    tracking = true;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!tracking) return;
    e.preventDefault(); // board swipe in progress
    tracking = false;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    let dir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }
    onDirection(dir);
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