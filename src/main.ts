import './styles/main.css';
import './styles/landing.css';
import { LandingView } from './ui/LandingView';
import { LoadingView } from './ui/LoadingView';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) {
  throw new Error('Missing #game-canvas');
}

const landing = new LandingView();
landing.onPlay(() => {
  landing.setStarting(true);
  void startGame(canvas);
});

async function startGame(gameCanvas: HTMLCanvasElement): Promise<void> {
  const loading = new LoadingView();
  loading.show();
  landing.hide();
  const [{ Game }, { preloadBootAssets }] = await Promise.all([
    import('./game/Game'),
    import('./rendering/preloadAssets'),
  ]);
  await preloadBootAssets((progress) => loading.update(progress));
  const game = new Game(gameCanvas);
  game.start();
  await loading.finish();
}
