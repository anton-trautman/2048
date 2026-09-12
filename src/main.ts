import './styles.css';
import { startGame } from './ui/game';

const root = document.getElementById('game');
if (root) startGame(root);