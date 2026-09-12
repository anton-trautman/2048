import type { Board, Direction, GameState, MoveResult } from './types';
import type { Rng } from './rng';

export function createGameState(
  board: Board,
  score = 0,
  won = false,
  over = false,
  keepPlaying = false,
): GameState {
  return { board, score, won, over, keepPlaying };
}

export function emptyCells(board: Board): number[] {
  const out: number[] = [];
  for (let i = 0; i < board.length; i++) if (board[i] === 0) out.push(i);
  return out;
}

export function spawnTile(board: Board, index: number, rng: Rng): Board {
  const next = [...board];
  next[index] = rng() < 0.9 ? 2 : 4;
  return next;
}

export function newGame(rng: Rng): GameState {
  let board: Board = Array<number>(16).fill(0);
  for (let i = 0; i < 2; i++) {
    const empty = emptyCells(board);
    board = spawnTile(board, empty[Math.floor(rng() * empty.length)], rng);
  }
  return createGameState(board);
}

// Leftward primitive: compact -> merge left-to-right (each tile at most once) -> pad.
// A product of a merge is never compared against the next tile, so
// [2,2,4,8] -> [4,4,8,0] and [4,4,8,8] -> [8,16,0,0].
export function slideRow(row: readonly number[]): [readonly number[], number] {
  const tiles = row.filter(v => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      out.push(tiles[i] * 2);
      gained += tiles[i] * 2;
      i++;
    } else {
      out.push(tiles[i]);
    }
  }
  while (out.length < 4) out.push(0);
  return [out, gained];
}

export function canMove(state: GameState): boolean {
  const b = state.board;
  for (let i = 0; i < 16; i++) {
    const v = b[i];
    if (v === 0) return true;
    const col = i % 4;
    if (col < 3 && b[i + 1] === v) return true;
    if (i < 12 && b[i + 4] === v) return true;
  }
  return false;
}

// Cell index tuples, ordered in the slide direction for each of the 4 lines.
function lines(dir: Direction): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let l = 0; l < 4; l++) {
    if (dir === 'left') out.push([l * 4, l * 4 + 1, l * 4 + 2, l * 4 + 3]);
    else if (dir === 'right') out.push([l * 4 + 3, l * 4 + 2, l * 4 + 1, l * 4]);
    else if (dir === 'up') out.push([l, l + 4, l + 8, l + 12]);
    else out.push([l + 12, l + 8, l + 4, l]);
  }
  return out;
}

export function move(state: GameState, dir: Direction, rng: Rng): MoveResult {
  const b = state.board;
  const next: number[] = Array<number>(16).fill(0);
  let gained = 0;
  for (const line of lines(dir)) {
    const [row, g] = slideRow([b[line[0]], b[line[1]], b[line[2]], b[line[3]]]);
    for (let k = 0; k < 4; k++) next[line[k]] = row[k];
    gained += g;
  }

  const moved = next.some((v, i) => v !== b[i]);
  if (!moved) return { state, moved: false, gained: 0 }; // rng NOT consumed

  const empty = emptyCells(next);
  const board = spawnTile(next, empty[Math.floor(rng() * empty.length)], rng);
  const over = !canMove(createGameState(board));
  const newState = createGameState(
    board,
    state.score + gained,
    state.won || board.some(v => v === 2048),
    over,
    state.keepPlaying,
  );
  return { state: newState, moved: true, gained };
}
