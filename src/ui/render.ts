import type { Direction, GameState } from '../game/types';
import { computeCellAnims } from './anim';

interface Scene {
  scoreValue: HTMLElement;
  newGameBtn: HTMLButtonElement;
  overlay: HTMLElement;
  overlayText: HTMLElement;
  overlayBtn: HTMLButtonElement;
  boardWrap: HTMLElement;
  board: HTMLElement;
  cells: HTMLDivElement[];
  newGameCb: () => void;
  keepPlayingCb: () => void;
  overlayCb: () => void;
  lastBoard: readonly number[];
}

// Stable DOM per root: built once, updated in place on every render.
// No root.replaceChildren() → no flicker, focus and animations survive.
const scenes = new WeakMap<HTMLElement, Scene>();

function baseCellClass(v: number): string {
  if (v === 0) return 'cell tile-0';
  const cls = v >= 4096 ? 'tile-super' : `tile-${v}`;
  const digits = String(v).length;
  const sizeCls = digits >= 4 ? 'digits-4' : digits === 3 ? 'digits-3' : '';
  return `cell ${cls}${sizeCls ? ` ${sizeCls}` : ''}`;
}

function buildScene(root: HTMLElement): Scene {
  const header = document.createElement('header');
  header.className = 'header';
  const title = document.createElement('h1');
  title.textContent = '2048';
  const scoreBox = document.createElement('div');
  scoreBox.className = 'score-box';
  scoreBox.setAttribute('aria-live', 'polite');
  const scoreLabel = document.createElement('div');
  scoreLabel.className = 'score-label';
  scoreLabel.textContent = 'Score';
  const scoreValue = document.createElement('div');
  scoreValue.className = 'score-value';
  scoreBox.append(scoreLabel, scoreValue);
  const newGameBtn = document.createElement('button');
  newGameBtn.className = 'btn';
  newGameBtn.setAttribute('type', 'button');
  newGameBtn.textContent = 'New Game';
  // Callback is read at click time from the scene, so the latest render's
  // handlers win without rewiring listeners.
  newGameBtn.addEventListener('click', () => {
    scenes.get(root)?.newGameCb();
  });
  header.append(title, scoreBox, newGameBtn);

  const boardWrap = document.createElement('div');
  boardWrap.className = 'board-wrap';
  const board = document.createElement('div');
  board.className = 'board';
  const cells: HTMLDivElement[] = [];
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell tile-0';
    cells.push(cell);
    board.append(cell);
  }
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.hidden = true;
  const overlayText = document.createElement('div');
  overlayText.className = 'overlay-text';
  const overlayBtn = document.createElement('button');
  overlayBtn.className = 'btn';
  overlayBtn.setAttribute('type', 'button');
  overlay.append(overlayText, overlayBtn);
  overlayBtn.addEventListener('click', () => {
    scenes.get(root)?.overlayCb();
  });
  boardWrap.append(board, overlay);
  root.append(header, boardWrap);

  return {
    scoreValue,
    newGameBtn,
    overlay,
    overlayText,
    overlayBtn,
    boardWrap,
    board,
    cells,
    newGameCb: () => {},
    keepPlayingCb: () => {},
    overlayCb: () => {},
    lastBoard: [],
  };
}

export function render(
  root: HTMLElement,
  state: GameState,
  onNewGame: () => void,
  onKeepPlaying: () => void,
  dir?: Direction | null,
): void {
  let scene: Scene | undefined = scenes.get(root);
  if (!scene) {
    scene = buildScene(root);
    scenes.set(root, scene);
  }

  scene.newGameCb = onNewGame;
  scene.keepPlayingCb = onKeepPlaying;
  scene.scoreValue.textContent = String(state.score);

  // Animation metadata is only known for real moves; new-game / keep-playing
  // renders reset the board without animating it.
  const anims =
    dir != null
      ? computeCellAnims(scene.lastBoard, state.board, dir)
      : null;

  for (let i = 0; i < 16; i++) {
    const cell = scene.cells[i];
    const v = state.board[i];
    cell.textContent = String(v);
    const a = anims?.[i] ?? null;
    const merged = !!a?.merged;
    const spawn = !!a?.spawn;
    const slid = !!a?.from && a.from !== i && !merged && !spawn;

    cell.className = baseCellClass(v); // strip all animation classes
    if (slid) {
      // Slide: translate from the tile's previous cell (stable DOM means
      // the from cell's rect is exactly where the tile sat before this move).
      void cell.offsetWidth; // commit the class removal so re-adding restarts
      const fromCell = scene.cells[a.from!];
      const fr = fromCell.getBoundingClientRect();
      const to = cell.getBoundingClientRect();
      cell.style.setProperty('--slide-dx', `${to.left - fr.left}px`);
      cell.style.setProperty('--slide-dy', `${to.top - fr.top}px`);
      cell.classList.add('tile-slide');
    } else if (merged) {
      void cell.offsetWidth;
      cell.classList.add('tile-merged');
    } else if (spawn) {
      void cell.offsetWidth;
      cell.classList.add('tile-spawn');
    }
  }
  scene.lastBoard = state.board;

  // Overlay is a single persistent element inside board-wrap; hidden unless
  // game over (sticky) or won without keep-playing.
  if (state.over) {
    scene.overlayText.textContent = 'Game over!';
    scene.overlayBtn.textContent = 'New Game';
    scene.overlayCb = onNewGame;
    scene.overlay.hidden = false;
  } else if (state.won && !state.keepPlaying) {
    scene.overlayText.textContent = 'You win!';
    scene.overlayBtn.textContent = 'Keep going';
    scene.overlayCb = onKeepPlaying;
    scene.overlay.hidden = false;
  } else {
    scene.overlay.hidden = true;
    // A hidden overlay must never act on a stale callback (it can't be
    // clicked in the browser, but defensive programming wins in tests).
    scene.overlayCb = () => {};
  }
}
