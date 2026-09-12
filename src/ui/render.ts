import type { GameState } from '../game/types';

export function render(
  root: HTMLElement,
  state: GameState,
  onNewGame: () => void,
  onKeepPlaying: () => void,
): void {
  root.replaceChildren();

  const header = document.createElement('header');
  header.className = 'header';
  const title = document.createElement('h1');
  title.textContent = '2048';
  const scoreBox = document.createElement('div');
  scoreBox.className = 'score-box';
  const scoreLabel = document.createElement('div');
  scoreLabel.className = 'score-label';
  scoreLabel.textContent = 'Score';
  const scoreValue = document.createElement('div');
  scoreValue.className = 'score-value';
  scoreValue.textContent = String(state.score);
  scoreBox.append(scoreLabel, scoreValue);
  const newGameBtn = document.createElement('button');
  newGameBtn.className = 'btn';
  newGameBtn.textContent = 'New Game';
  newGameBtn.addEventListener('click', onNewGame);
  header.append(title, scoreBox, newGameBtn);

  const boardWrap = document.createElement('div');
  boardWrap.className = 'board-wrap';
  const board = document.createElement('div');
  board.className = 'board';
  for (const v of state.board) {
    const cell = document.createElement('div');
    if (v === 0) {
      cell.className = 'cell tile-0';
    } else {
      const cls = v >= 4096 ? 'tile-super' : `tile-${v}`;
      const digits = String(v).length;
      const sizeCls = digits >= 4 ? 'digits-4' : digits === 3 ? 'digits-3' : '';
      cell.className = `cell ${cls}${sizeCls ? ` ${sizeCls}` : ''}`;
      cell.textContent = String(v);
    }
    board.append(cell);
  }
  boardWrap.append(board);

  if (state.over) {
    boardWrap.append(overlay('Game over!', 'New Game', onNewGame));
  } else if (state.won && !state.keepPlaying) {
    boardWrap.append(overlay('You win!', 'Keep going', onKeepPlaying));
  }

  root.append(header, boardWrap);
}

function overlay(title: string, buttonLabel: string, onClick: () => void): HTMLElement {
  const el = document.createElement('div');
  el.className = 'overlay';
  const text = document.createElement('div');
  text.className = 'overlay-text';
  text.textContent = title;
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = buttonLabel;
  btn.addEventListener('click', onClick);
  el.append(text, btn);
  return el;
}