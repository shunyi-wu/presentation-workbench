import './styles/workbench-gallery.css';

import { attachAnnotationLayer } from './components/AnnotationLayer.js';
import { attachWorkbenchGallery, playWorkbenchEntryTransition, renderWorkbenchGallery } from './components/WorkbenchGallery.js';
import { deckCatalog, getDeckId, loadDeck } from './deckRegistry.js';

const app = document.querySelector('#app');

let activeCleanup = () => {};
let navRevealTimer = 0;
const deckMarkupCache = new Map();

function cleanupActiveSurface() {
  activeCleanup();
  activeCleanup = () => {};
  window.__WORKBENCH__ = false;
  window.__WORKBENCH_GALLERY__ = null;
  window.__DECK_ID__ = undefined;
  window.__SLIDE_COUNT__ = undefined;
  window.__SHOW_SLIDE__ = undefined;
  window.__WARM_DECK__ = undefined;
}

function renderGallery({ returningDeckId = '', viewTransitionName = '', focusDeckId = '' } = {}) {
  cleanupActiveSurface();
  document.title = 'Presentation Workbench';
  document.body.dataset.surface = 'workbench-gallery';
  app.innerHTML = renderWorkbenchGallery({ decks: deckCatalog });
  if (returningDeckId && viewTransitionName) {
    const targetCover = document.querySelector(`[data-deck-id="${CSS.escape(returningDeckId)}"] [data-gallery-cover-link]`);
    if (targetCover) targetCover.style.viewTransitionName = viewTransitionName;
  }
  window.__WORKBENCH__ = true;
  window.__DECK_CATALOG__ = deckCatalog;
  window.__WARM_DECK__ = (deckId) => buildDeckView(deckId).catch((error) => {
    console.warn(`Unable to warm deck cache for ${deckId}`, error);
  });
  window.__WORKBENCH_GALLERY__ = attachWorkbenchGallery(document, { focusDeckId });

  activeCleanup = () => {
    window.__WORKBENCH_GALLERY__?.destroy?.();
  };
}

async function buildDeckView(deckId, labId = '') {
  const cacheKey = `${deckId}::${labId}`;
  if (deckMarkupCache.has(cacheKey)) return deckMarkupCache.get(cacheKey);

  const deck = await loadDeck(deckId);
  const lab = labId ? deck.labs?.[labId] : null;

  if (labId && !lab) {
    throw new Error(`Unknown lab "${labId}" for deck "${deck.id}"`);
  }

  const slides = deck.slides || [];
  const renderers = deck.renderers || {};
  const markup = lab
    ? lab.render()
    : slides.map((slide) => {
      const layout = slide.layout || deck.defaultLayout;
      const render = renderers[layout];
      if (!render) throw new Error(`Unknown layout: ${layout}`);
      return render({ ...slide, layout, total: slides.length });
    }).join('');

  const view = { deck, lab, slides, markup };
  deckMarkupCache.set(cacheKey, view);
  return view;
}

async function renderDeckFromParams(params, { updateHistory = false, playEntry = false, navTransitionName = '' } = {}) {
  cleanupActiveSurface();
  delete document.body.dataset.surface;

  const deckId = getDeckId(params);
  const labId = params.get('lab') || '';
  const { deck, lab, slides, markup } = await buildDeckView(deckId, labId);

  document.title = deck.title || document.title;
  app.innerHTML = `
    <div class="presentation-root" data-presentation-root>
      <div class="stage" data-deck-id="${deck.id}">
        <main class="deck" data-deck>${markup}</main>
        <nav class="nav" data-deck-nav>
          <button data-home aria-label="回到工作台桌面" title="桌面">桌面</button>
          <button data-prev aria-label="上一页">←</button>
          <span data-count>1 / ${lab ? 'LAB' : slides.length}</span>
          <button data-next aria-label="下一页">→</button>
          <button data-annotate aria-label="标注，快捷键 A" aria-pressed="false" title="标注 (A)">标注</button>
          <button data-full aria-label="进入全屏" aria-pressed="false">全屏</button>
        </nav>
      </div>
    </div>
  `;

  const stageEl = document.querySelector('.stage');
  const navEl = document.querySelector('[data-deck-nav]');
  const slideEls = [...document.querySelectorAll('[data-slide]')];
  let fullscreenCurtainTimer = 0;
  let annotationLayer = null;
  let index = Math.max(0, Math.min(slideEls.length - 1, Number(params.get('slide') || 1) - 1));

  function show(nextIndex, shouldUpdateUrl = true) {
    index = (nextIndex + slideEls.length) % slideEls.length;
    slideEls.forEach((el, i) => el.classList.toggle('active', i === index));
    document.querySelector('[data-count]').textContent = `${index + 1} / ${slideEls.length}`;
    if (shouldUpdateUrl) {
      const nextParams = new URLSearchParams(location.search);
      nextParams.set('deck', deck.id);
      nextParams.set('slide', String(index + 1));
      history.replaceState(null, '', `?${nextParams.toString()}`);
    }
    if (lab) window.__INTERACTION_LAB_RENDER__?.();
    document.dispatchEvent(new CustomEvent('slidechange', { detail: { index, slide: index + 1, deck: deck.id } }));
  }

  function revealNav(delay = 0) {
    clearTimeout(navRevealTimer);
    if (delay <= 0) {
      navEl?.classList.add('is-ready');
      return;
    }

    navRevealTimer = window.setTimeout(() => {
      navEl?.classList.add('is-ready');
    }, delay);
  }

  function fit() {
    const rect = stageEl.getBoundingClientRect();
    const width = rect.width || innerWidth;
    const height = rect.height || innerHeight;
    const scale = Math.min(width / 1600, height / 900);
    stageEl.style.setProperty('--scale', String(scale));
  }

  function syncFit() {
    fit();
    requestAnimationFrame(fit);
  }

  function syncAfterFullscreenChange() {
    fit();
    requestAnimationFrame(() => {
      fit();
      requestAnimationFrame(() => {
        fit();
      });
    });
  }

  function fullscreenTarget() {
    return document.documentElement;
  }

  function isPresentationFullscreen() {
    return document.fullscreenElement === fullscreenTarget();
  }

  function showFullscreenCurtain() {
    clearTimeout(fullscreenCurtainTimer);
    stageEl.classList.add('is-fullscreen-transitioning');
    stageEl.getBoundingClientRect();
  }

  function showEnterFullscreenCurtain() {
    if (!document.fullscreenElement) showFullscreenCurtain();
  }

  function hideFullscreenCurtain(delay = 320) {
    clearTimeout(fullscreenCurtainTimer);
    fullscreenCurtainTimer = window.setTimeout(() => {
      stageEl.classList.remove('is-fullscreen-transitioning');
    }, delay);
  }

  function syncFullscreenUi() {
    const fullButton = document.querySelector('[data-full]');
    if (!fullButton) return;
    if (isPresentationFullscreen()) {
      fullButton.textContent = '退出';
      fullButton.setAttribute('aria-label', '退出全屏');
      fullButton.setAttribute('aria-pressed', 'true');
    } else {
      fullButton.textContent = '全屏';
      fullButton.setAttribute('aria-label', '进入全屏');
      fullButton.setAttribute('aria-pressed', 'false');
    }
  }

  function handleFullscreenChange() {
    syncFullscreenUi();
    syncAfterFullscreenChange();
    hideFullscreenCurtain();
  }

  function handleKeydown(event) {
    const annotating = document.querySelector('[data-annotate]')?.getAttribute('aria-pressed') === 'true';
    if (event.key === 'ArrowRight') show(index + 1);
    if (event.key === 'ArrowLeft') show(index - 1);
    if (!annotating && event.key === ' ') show(index + 1);
  }

  async function returnToDesktop() {
    const transitionName = 'workbench-cover-expand';
    const deckEl = document.querySelector('[data-deck]');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (document.startViewTransition && deckEl && !reducedMotion) {
      deckEl.style.viewTransitionName = transitionName;
      const transition = document.startViewTransition(() => {
        history.pushState(null, '', location.pathname);
        renderGallery({ returningDeckId: deck.id, viewTransitionName: transitionName, focusDeckId: deck.id });
      });
      try {
        await transition.finished;
      } finally {
        deckEl.style.viewTransitionName = '';
        const targetCover = document.querySelector(`[data-deck-id="${CSS.escape(deck.id)}"] [data-gallery-cover-link]`);
        if (targetCover) targetCover.style.viewTransitionName = '';
      }
      return;
    }

    history.pushState(null, '', location.pathname);
    renderGallery();
  }

  document.querySelector('[data-prev]').addEventListener('click', () => show(index - 1));
  document.querySelector('[data-next]').addEventListener('click', () => show(index + 1));
  document.querySelector('[data-home]').addEventListener('click', returnToDesktop);
  const fullscreenButton = document.querySelector('[data-full]');
  fullscreenButton.addEventListener('pointerdown', () => showEnterFullscreenCurtain());
  fullscreenButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') showEnterFullscreenCurtain();
  });
  fullscreenButton.addEventListener('click', async () => {
    const enteringFullscreen = !document.fullscreenElement;
    if (enteringFullscreen) showFullscreenCurtain();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
      } else {
        await fullscreenTarget().requestFullscreen?.({ navigationUI: 'hide' });
      }
    } catch (error) {
      stageEl.classList.remove('is-fullscreen-transitioning');
      console.warn('Fullscreen request failed', error);
    } finally {
      syncFullscreenUi();
      syncFit();
      if (enteringFullscreen) hideFullscreenCurtain();
    }
  });
  document.querySelectorAll('[data-reveal-trigger]').forEach((button) => {
    button.addEventListener('click', () => {
      button.closest('[data-slide]')?.classList.toggle('revealed', true);
    });
  });

  addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('keydown', handleKeydown);

  fit();
  show(index, false);
  if (updateHistory) {
    const nextParams = new URLSearchParams(params);
    nextParams.set('deck', deck.id);
    nextParams.set('slide', String(index + 1));
    history.pushState(null, '', `?${nextParams.toString()}`);
  }

  annotationLayer = attachAnnotationLayer(document);
  for (const attach of deck.attachments || []) {
    attach(document);
  }
  lab?.attach?.(document);

  window.__DECK_ID__ = deck.id;
  window.__SLIDE_COUNT__ = slideEls.length;
  window.__SHOW_SLIDE__ = (number) => show(number - 1);

  activeCleanup = () => {
    clearTimeout(navRevealTimer);
    clearTimeout(fullscreenCurtainTimer);
    annotationLayer?.destroy?.();
    removeEventListener('resize', fit);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('keydown', handleKeydown);
  };

  revealNav(0);
  if (playEntry) playWorkbenchEntryTransition();
  if (navTransitionName && navEl) navEl.style.viewTransitionName = navTransitionName;
}

async function openDeck(url, options = {}) {
  const nextUrl = new URL(url, location.href);
  await renderDeckFromParams(nextUrl.searchParams, {
    updateHistory: true,
    playEntry: options.playEntry === true,
    navTransitionName: options.navTransitionName || '',
  });
  if (options.viewTransitionName) {
    const deck = document.querySelector('[data-deck]');
    if (deck) deck.style.viewTransitionName = options.viewTransitionName;
  }
}

window.__OPEN_DECK__ = openDeck;

window.addEventListener('popstate', () => {
  const nextParams = new URLSearchParams(location.search);
  if (nextParams.has('deck')) {
    void renderDeckFromParams(nextParams);
  } else {
    renderGallery();
  }
});

const params = new URLSearchParams(location.search);
if (params.has('deck')) {
  await renderDeckFromParams(params, { playEntry: true });
} else {
  renderGallery();
}
