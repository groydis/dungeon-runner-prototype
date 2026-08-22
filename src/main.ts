import { Game } from './game/Game';
import './styles/main.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) {
  throw new Error('Missing #game-canvas');
}

const game = new Game(canvas);
game.start();
