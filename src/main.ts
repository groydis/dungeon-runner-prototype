import { Game } from './game/Game';
import { preloadBootAssets } from './rendering/preloadAssets';
import './styles/main.css';
import { LoadingView } from './ui/LoadingView';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) {
  throw new Error('Missing #game-canvas');
}

async function boot(gameCanvas: HTMLCanvasElement): Promise<void> {
  const loading = new LoadingView();
  await preloadBootAssets((progress) => loading.update(progress));
  const game = new Game(gameCanvas);
  game.start();
  await loading.finish();
}

void boot(canvas);
