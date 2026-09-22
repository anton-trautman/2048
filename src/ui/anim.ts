import type { Board, Direction } from '../game/types';

export interface CellAnim {
  from: number | null; // index in the previous board the tile came from
  merged: boolean;
  spawn: boolean;
}

export function computeCellAnims(prev: Board, next: Board, dir: Direction): CellAnim[] {
  const out: CellAnim[] = Array.from({ length: 16 }, () => ({ from: null, merged: false, spawn: false }));
  for (let line = 0; line < 4; line++) {
  const horiz = dir === 'left' || dir === 'right';
  const towardLow = dir === 'left' || dir === 'up';
  const result: { v: number; froms: number[] }[] = [];
  for (const i of tiles) {
    ...
  }
}
```

Now writing everything.