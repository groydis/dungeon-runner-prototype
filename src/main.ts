import './styles/main.css';
import './styles/landing.css';
import './styles/about.css';
import { AboutView } from './ui/AboutView';
import { LandingView } from './ui/LandingView';
import { LoadingView } from './ui/LoadingView';
import { SiteNav } from './ui/SiteNav';
import { sitePageFromPath, titleForSitePage, type SitePage } from './ui/siteRoute';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) {
  throw new Error('Missing #game-canvas');
}

const landing = new LandingView();
const about = new AboutView();
const nav = new SiteNav(
  () => goTo('home'),
  () => goTo('about'),
);

landing.onPlay(() => {
  nav.hide();
  about.hide();
  landing.setStarting(true);
  void startGame(canvas);
});

window.addEventListener('popstate', () => {
  applyPage(sitePageFromPath(location.pathname));
});
applyPage(sitePageFromPath(location.pathname));

function goTo(page: SitePage): void {
  const url = page === 'about' ? '/about' : '/';
  if (sitePageFromPath(location.pathname) !== page) {
    history.pushState({}, '', url);
  }
  applyPage(page);
}

function applyPage(page: SitePage): void {
  document.title = titleForSitePage(page);
  nav.setActive(page);
  nav.show();
  if (page === 'about') {
    landing.hide();
    about.show();
    return;
  }
  about.hide();
  landing.show();
}

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
