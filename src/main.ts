import './styles/main.css';
import './styles/landing.css';
import './styles/about.css';
import { AboutView } from './ui/AboutView';
import { ClassesGallery } from './ui/ClassesGallery';
import { LandingView } from './ui/LandingView';
import { LoadingView } from './ui/LoadingView';
import { PageOverlay } from './ui/PageOverlay';
import { SiteNav } from './ui/SiteNav';
import { WaitlistForms } from './ui/WaitlistForms';
import { pathForSitePage, sitePageFromPath, titleForSitePage, type SitePage } from './ui/siteRoute';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) {
  throw new Error('Missing #game-canvas');
}

const landing = new LandingView();
const about = new AboutView();
const classes = new PageOverlay(document, '#classes');
const classGallery = new ClassesGallery();
const privacy = new PageOverlay(document, '#privacy');
const support = new PageOverlay(document, '#support');
const nav = new SiteNav((page) => goTo(page));
new WaitlistForms();

landing.onPlay(() => {
  nav.hide();
  about.hide();
  classes.hide();
  privacy.hide();
  support.hide();
  landing.setStarting(true);
  void startGame(canvas);
});

window.addEventListener('popstate', () => {
  applyPage(sitePageFromPath(location.pathname));
});
applyPage(sitePageFromPath(location.pathname));

function goTo(page: SitePage): void {
  if (sitePageFromPath(location.pathname) !== page) {
    history.pushState({}, '', pathForSitePage(page));
  }
  applyPage(page);
}

function applyPage(page: SitePage): void {
  document.title = titleForSitePage(page);
  nav.setActive(page);
  nav.show();
  landing.hide();
  about.hide();
  classes.hide();
  privacy.hide();
  support.hide();
  classGallery.rest();
  if (page === 'classes') {
    classes.show();
    classGallery.activate();
    return;
  }
  if (page === 'about') {
    about.show();
    return;
  }
  if (page === 'privacy') {
    privacy.show();
    return;
  }
  if (page === 'support') {
    support.show();
    return;
  }
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
