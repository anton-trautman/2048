import type { Direction, GameState } from '../game/types';
import { move, newGame } from '../game/engine';
import { createRng, randomSeed, type Rng } from '../game/rng';
import { render } from './render';
import { bindInput } from './input';

export function startGame(root: HTMLElement): void {
  let rng: Rng = createRng(randomSeed());
  let state: GameState = newGame(rng);

  const onNewGame = () => {
    rng = createRng(randomSeed());
    state = newGame(rng);
    draw();
  };
  const onKeepPlaying = () => {
    state = { ...state, keepPlaying: true };
    draw();
  };
  const onDirection = (dir: Direction) => {
    if (state.over || (state.won && !state.keepPlaying)) return;
    const result = move(state, dir, rng);
    if (result.moved) {
      state = result.state;
      draw();
    }
  };
  const draw = () => render(root, state, onNewGame, onKeepPlaying);

  bindInput(root, onDirection);
  draw();
}
