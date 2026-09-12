export type Board = readonly number[]; // length 16, row-major, 0 = empty
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameState {
  board: Board;
  score: number;
  won: boolean; // sticky; set once on first 2048 tile
  over: boolean; // true when no moves remain
  keepPlaying: boolean; // UI sets to dismiss win overlay
}

export interface MoveResult {
  state: GameState; // same object reference when !moved
  moved: boolean;
  gained: number; // score added by this move
}