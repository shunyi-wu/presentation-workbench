function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const LONG_PRESS_MS = 320;
const MOVE_THRESHOLD = 5;
const ORDER_ENDPOINT = '/__workbench/order';
const deckProfiles = {
  'workbench-usage-guide': {
    tone: 'timing',
    label: 'Usage Guide',
    title: 'How to Run',
    subtitle: 'Workflow, checks, delivery',
    marks: ['guide', 'workflow', 'quality'],
  },
  'placeholder-blank-01': {
    tone: 'system',
    label: 'Placeholder Deck',
    title: 'Blank 01',
    subtitle: 'Empty deck for gallery scale',
    marks: ['placeholder', 'blank', 'grid'],
  },
  'placeholder-blank-02': {
    tone: 'default',
    label: 'Placeholder Deck',
    title: 'Blank 02',
    subtitle: 'Empty deck for gallery scale',
    marks: ['placeholder', 'blank', 'grid'],
  },
  'placeholder-blank-03': {
    tone: 'system',
    label: 'Placeholder Deck',
    title: 'Blank 03',
    subtitle: 'Empty deck for gallery scale',
    marks: ['placeholder', 'blank', 'grid'],
  },
  'placeholder-blank-04': {
    tone: 'default',
    label: 'Placeholder Deck',
    title: 'Blank 04',
    subtitle: 'Empty deck for gallery scale',
    marks: ['placeholder', 'blank', 'grid'],
  },
};

function profileFor(deck, index) {
  const profile = deckProfiles[deck.id] || {
    tone: 'default',
    label: deck.title,
    title: deck.title,
    subtitle: deck.description || '',
    marks: [deck.kind || 'deck'],
  };

  return {
    ...profile,
    number: String(index + 1).padStart(2, '0'),
  };
}

function deckHref(deck) {
  return `/?deck=${encodeURIComponent(deck.id)}&slide=1`;
}

function artifactVisual(profile) {
  if (profile.tone === 'rtl') {
    return `
      <div class="workbench-gallery-rtl-diagram" aria-hidden="true">
        <span class="workbench-gallery-rtl-node input">D</span>
        <span class="workbench-gallery-rtl-line"></span>
        <span class="workbench-gallery-rtl-node register">Q</span>
        <span class="workbench-gallery-rtl-clock">clk</span>
        <span class="workbench-gallery-rtl-code">always_ff</span>
      </div>`;
  }

  if (profile.tone === 'system') {
    return `
      <div class="workbench-gallery-system-diagram" aria-hidden="true">
        <span></span><span></span><span></span>
        <i></i><i></i>
      </div>`;
  }

  if (profile.tone === 'timing') {
    return `
      <div class="workbench-gallery-timing-diagram" aria-hidden="true">
        <span class="workbench-gallery-timing-node launch">L</span>
        <span class="workbench-gallery-timing-path"></span>
        <span class="workbench-gallery-timing-node capture">C</span>
        <span class="workbench-gallery-timing-window"></span>
        <span class="workbench-gallery-timing-slack">+ slack</span>
      </div>`;
  }

  return '<div class="workbench-gallery-default-diagram" aria-hidden="true"></div>';
}

function deckCard(deck, index) {
  const image = `/decks/${encodeURIComponent(deck.id)}/review/current/slide-01.png`;
  const profile = profileFor(deck, index);
  const marks = profile.marks.map((mark) => `<span>${esc(mark)}</span>`).join('');

  return `
    <article class="workbench-gallery-card is-${esc(profile.tone)}" data-gallery-card data-deck-id="${esc(deck.id)}" data-card-index="${index}" style="--card-index: ${index}" aria-label="${esc(deck.title)}">
      <div class="workbench-gallery-plate" data-gallery-plate>
        <div class="workbench-gallery-number" data-gallery-number>${esc(profile.number)}</div>
        <div class="workbench-gallery-copy">
          <p>${esc(profile.label)}</p>
          <h2>${esc(profile.title)}</h2>
          <span>${esc(profile.subtitle)}</span>
        </div>
        ${artifactVisual(profile)}
        <div class="workbench-gallery-marks" aria-hidden="true">${marks}</div>
        <a class="workbench-gallery-cover-link" href="${deckHref(deck)}" data-gallery-cover-link aria-label="打开 ${esc(deck.title)}">
          <figure class="workbench-gallery-cover" data-gallery-cover data-cover-label="${esc(deck.title)}">
            <img src="${image}" alt="${esc(deck.title)} 完整封面预览" loading="${index < 2 ? 'eager' : 'lazy'}" draggable="false" onerror="this.hidden=true;this.closest('[data-gallery-cover]')?.classList.add('is-missing-cover')">
          </figure>
        </a>
      </div>
    </article>`;
}

export function renderWorkbenchGallery({ decks } = {}) {
  const cards = decks.map(deckCard).join('');

  return `
    <main class="workbench-gallery" data-workbench-gallery>
      <section class="workbench-gallery-stage" aria-label="Deck gallery">
        <div class="workbench-gallery-track" data-gallery-track>
          ${cards}
        </div>
      </section>

      <aside class="workbench-gallery-rail" aria-label="Gallery state">
        <div class="workbench-gallery-count">
          <span data-gallery-index>01</span>
          <span data-gallery-total>${String(decks.length).padStart(2, '0')}</span>
        </div>
        <div class="workbench-gallery-progress" aria-hidden="true">
          <span data-gallery-progress></span>
        </div>
        <p data-gallery-status>Scroll / Hold</p>
      </aside>
    </main>`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function cardId(card) {
  return card?.dataset.deckId || '';
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function nativeTransitionToDeck(link, href) {
  const transitionName = 'workbench-cover-expand';
  const navTransitionName = 'workbench-deck-nav';
  link.style.viewTransitionName = transitionName;

  const transition = document.startViewTransition(async () => {
    await window.__OPEN_DECK__(href, {
      viewTransitionName: transitionName,
      navTransitionName,
    });
  });

  try {
    await transition.finished;
  } finally {
    link.style.viewTransitionName = '';
    const deck = document.querySelector('[data-deck]');
    if (deck) deck.style.viewTransitionName = '';
    const nav = document.querySelector('[data-deck-nav]');
    if (nav) nav.style.viewTransitionName = '';
  }
}

async function transitionToDeck(event) {
  const link = event.currentTarget;
  const href = link.href;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

  event.preventDefault();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!window.__OPEN_DECK__) {
    window.location.href = href;
    return;
  }

  if (document.startViewTransition && !reducedMotion) {
    await nativeTransitionToDeck(link, href);
    return;
  }

  await window.__OPEN_DECK__(href, { playEntry: !reducedMotion });
}

export function playWorkbenchEntryTransition() {
  const deck = document.querySelector('[data-deck]');
  if (!deck) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!deck.animate) return;

  deck.classList.add('is-workbench-entering');
  requestAnimationFrame(() => {
    const animation = deck.animate([
      { opacity: 0 },
      { opacity: 1 },
    ], { duration: 180, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' });
    animation.finished.catch(() => {}).finally(() => {
      deck.classList.remove('is-workbench-entering');
    });
  });
}

export function attachWorkbenchGallery(root = document, { focusDeckId = '' } = {}) {
  const page = root.querySelector('[data-workbench-gallery]');
  const track = root.querySelector('[data-gallery-track]');
  const progress = root.querySelector('[data-gallery-progress]');
  const indexLabel = root.querySelector('[data-gallery-index]');
  const statusLabel = root.querySelector('[data-gallery-status]');
  if (!page || !track) return null;

  const state = {
    cards: [...root.querySelectorAll('[data-gallery-card]')],
    current: 0,
    target: 0,
    max: 0,
    browsing: false,
    sorting: false,
    pointerId: null,
    pointerStartX: 0,
    pointerStartY: 0,
    pointerX: 0,
    pointerY: 0,
    dragStartTarget: 0,
    dragStartCard: null,
    dragPlaceholder: null,
    initialOrder: [],
    savedOrder: [],
    longPressTimer: 0,
    pointerStartedOnCover: false,
    suppressClick: false,
    saveState: 'idle',
    pendingOrder: null,
    savingOrder: null,
    sortStartCurrent: 0,
    raf: 0,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  if (state.cards.length === 0) return null;

  function getCards() {
    return [...track.querySelectorAll('[data-gallery-card]')];
  }

  function getOrder() {
    return getCards().map(cardId);
  }

  function setStatus(status) {
    state.saveState = status;
    page.dataset.saveState = status;
    if (!statusLabel) return;
    const labels = {
      idle: 'Scroll / Hold',
      dirty: 'Saving order',
      saving: 'Saving order',
      saved: 'Order saved',
      error: 'Save failed',
    };
    statusLabel.textContent = labels[status] || labels.idle;
  }

  function renumberCards() {
    getCards().forEach((card, index) => {
      card.dataset.cardIndex = String(index);
      card.style.setProperty('--card-index', index);
      const number = card.querySelector('[data-gallery-number]');
      if (number) number.textContent = String(index + 1).padStart(2, '0');
    });
  }

  function measure() {
    state.cards = getCards();
    const last = state.cards[state.cards.length - 1];
    if (!last) {
      state.max = 0;
      return;
    }
    const pageRect = page.getBoundingClientRect();
    const lastRight = track.offsetLeft + last.offsetLeft + last.offsetWidth;
    const rightInset = clamp(pageRect.width * 0.06, 64, 140);
    state.max = Math.max(0, lastRight - pageRect.width + rightInset);
    state.target = clamp(state.target, 0, state.max);
    state.current = clamp(state.current, 0, state.max);
  }

  function closestIndex() {
    let index = 0;
    let closestDistance = Infinity;

    state.cards.forEach((card, cardIndex) => {
      const cardCenter = track.offsetLeft + card.offsetLeft + card.offsetWidth * 0.5;
      const snapPoint = clamp(cardCenter - window.innerWidth * 0.5, 0, state.max);
      const distance = Math.abs(state.current - snapPoint);
      if (distance < closestDistance) {
        closestDistance = distance;
        index = cardIndex;
      }
    });

    if (state.max > 0 && state.current >= state.max - 1) index = state.cards.length - 1;
    if (state.current <= 1) index = 0;
    return index;
  }

  function syncMeta() {
    if (progress) {
      const amount = state.max === 0 ? 1 : state.current / state.max;
      progress.style.transform = `scaleX(${clamp(amount, 0, 1)})`;
    }

    if (indexLabel) {
      indexLabel.textContent = String(closestIndex() + 1).padStart(2, '0');
    }
  }

  function render() {
    const ease = state.reducedMotion ? 1 : 0.095;
    state.current += (state.target - state.current) * ease;
    if (Math.abs(state.target - state.current) < 0.08) state.current = state.target;

    track.style.transform = `translate3d(${-state.current}px, 0, 0)`;
    syncMeta();
    state.raf = window.requestAnimationFrame(render);
  }

  function push(delta) {
    state.target = clamp(state.target + delta, 0, state.max);
  }

  function snapTargetForCard(card) {
    if (!card) return 0;
    const cardCenter = track.offsetLeft + card.offsetLeft + card.offsetWidth * 0.5;
    return clamp(cardCenter - window.innerWidth * 0.5, 0, state.max);
  }

  function focusCard(deckId) {
    if (!deckId) return;
    const card = getCards().find((item) => cardId(item) === deckId);
    const next = snapTargetForCard(card);
    state.current = next;
    state.target = next;
    track.style.transform = `translate3d(${-state.current}px, 0, 0)`;
    syncMeta();
  }

  function handleWheel(event) {
    event.preventDefault();
    const axisDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    push(axisDelta * 1.18);
  }

  function clearLongPress() {
    window.clearTimeout(state.longPressTimer);
    state.longPressTimer = 0;
  }

  function movedDistance(event) {
    return Math.hypot(event.clientX - state.pointerStartX, event.clientY - state.pointerStartY);
  }

  function sortableCardFromEvent(event) {
    if (event.target.closest?.('[data-gallery-cover-link]')) return null;
    return event.target.closest?.('[data-gallery-card]') || null;
  }

  function beginSorting() {
    if (!state.dragStartCard || state.browsing) return;

    state.sorting = true;
    state.initialOrder = getOrder();
    const rect = state.dragStartCard.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const clone = state.dragStartCard;
    const placeholder = document.createElement('div');
    placeholder.className = 'workbench-gallery-placeholder';
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;

    state.dragPlaceholder = placeholder;
    state.sortStartCurrent = state.current;
    clone.parentNode.insertBefore(placeholder, clone);
    clone.classList.add('is-sorting');
    clone.style.width = `${rect.width}px`;
    clone.style.left = `${rect.left - trackRect.left}px`;
    clone.style.top = `${rect.top - trackRect.top}px`;
    clone.style.transform = 'translate3d(0, 0, 0)';
    track.appendChild(clone);

    page.classList.add('is-sorting');
    setStatus('idle');
  }

  function candidateBeforeCard(pointerX) {
    const cards = getCards().filter((card) => card !== state.dragStartCard);
    return cards.find((card) => {
      const rect = card.getBoundingClientRect();
      return pointerX < rect.left + rect.width * 0.5;
    }) || null;
  }

  function updateSorting(event) {
    if (!state.sorting || !state.dragStartCard || !state.dragPlaceholder) return;

    const dx = event.clientX - state.pointerStartX;
    const dy = event.clientY - state.pointerStartY;
    const scrollCompensation = state.current - state.sortStartCurrent;
    state.dragStartCard.style.transform = `translate3d(${dx + scrollCompensation}px, ${dy}px, 0)`;

    const beforeCard = candidateBeforeCard(event.clientX);
    if (beforeCard) {
      track.insertBefore(state.dragPlaceholder, beforeCard);
    } else {
      const sortingCard = state.dragStartCard;
      track.insertBefore(state.dragPlaceholder, sortingCard);
    }

    const edge = Math.min(window.innerWidth * 0.14, 160);
    if (event.clientX > window.innerWidth - edge) push(18);
    if (event.clientX < edge) push(-18);
  }

  function finishSorting() {
    if (!state.sorting || !state.dragStartCard || !state.dragPlaceholder) return;

    const card = state.dragStartCard;
    state.dragPlaceholder.parentNode.insertBefore(card, state.dragPlaceholder);
    state.dragPlaceholder.remove();
    state.dragPlaceholder = null;
    card.classList.remove('is-sorting');
    card.style.width = '';
    card.style.left = '';
    card.style.top = '';
    card.style.transform = '';
    page.classList.remove('is-sorting');
    state.sorting = false;
    state.cards = getCards();
    renumberCards();
    measure();

    const nextOrder = getOrder();
    if (!arraysEqual(state.initialOrder, nextOrder)) {
      queueSave(nextOrder);
    }
  }

  async function persistOrder(order) {
    const response = await fetch(ORDER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || 'Unable to save order.');
    }
    return payload.order || order;
  }

  function queueSave(order) {
    if (state.savingOrder && arraysEqual(state.savingOrder, order)) return;
    if (state.pendingOrder && arraysEqual(state.pendingOrder, order)) return;

    state.pendingOrder = order;
    if (state.saveState !== 'saving') setStatus('dirty');
    void drainSaveQueue();
  }

  async function drainSaveQueue() {
    if (state.saveState === 'saving') return;
    const order = state.pendingOrder;
    if (!order) return;

    state.pendingOrder = null;
    state.savingOrder = order;
    setStatus('saving');

    try {
      const savedOrder = await persistOrder(order);
      state.savedOrder = savedOrder;
      state.savingOrder = null;
      if (state.pendingOrder) {
        void drainSaveQueue();
        return;
      }
      setStatus('saved');
      window.setTimeout(() => {
        if (state.saveState === 'saved') setStatus('idle');
      }, 1400);
    } catch (error) {
      console.warn('Workbench order save failed', error);
      state.savingOrder = null;
      setStatus('error');
    }
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    const card = sortableCardFromEvent(event);
    const startedOnCover = Boolean(event.target.closest?.('[data-gallery-cover-link]'));

    state.pointerId = event.pointerId;
    state.pointerStartX = event.clientX;
    state.pointerStartY = event.clientY;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    state.dragStartTarget = state.target;
    state.dragStartCard = card;
    state.pointerStartedOnCover = startedOnCover;
    state.browsing = false;
    state.sorting = false;
    page.classList.add('is-dragging');
    if (!startedOnCover) page.setPointerCapture?.(event.pointerId);

    if (card) {
      state.longPressTimer = window.setTimeout(() => {
        beginSorting();
      }, LONG_PRESS_MS);
    }
  }

  function handlePointerMove(event) {
    if (state.pointerId !== event.pointerId) return;

    state.pointerX = event.clientX;
    state.pointerY = event.clientY;

    if (state.sorting) {
      event.preventDefault();
      updateSorting(event);
      return;
    }

    const delta = state.pointerStartX - event.clientX;
    if (movedDistance(event) > MOVE_THRESHOLD) {
      clearLongPress();
      state.browsing = true;
      state.suppressClick = true;
      if (state.pointerStartedOnCover && !page.hasPointerCapture?.(event.pointerId)) {
        page.setPointerCapture?.(event.pointerId);
      }
    }

    if (state.browsing) {
      event.preventDefault();
      state.target = clamp(state.dragStartTarget + delta * 1.25, 0, state.max);
    }
  }

  function stopPointer(event) {
    if (state.pointerId !== event.pointerId) return;
    clearLongPress();

    if (state.sorting) finishSorting();

    state.pointerId = null;
    state.dragStartCard = null;
    state.pointerStartedOnCover = false;
    state.browsing = false;
    page.classList.remove('is-dragging');
    if (page.hasPointerCapture?.(event.pointerId)) page.releasePointerCapture?.(event.pointerId);

    if (state.suppressClick) {
      window.setTimeout(() => {
        state.suppressClick = false;
      }, 0);
    }
  }

  function handleClick(event) {
    if (!state.suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function handleKeydown(event) {
    if (event.key === 'ArrowRight') push(window.innerWidth * 0.55);
    if (event.key === 'ArrowLeft') push(-window.innerWidth * 0.55);
    if (event.key === 'Home') state.target = 0;
    if (event.key === 'End') state.target = state.max;
  }

  function setOrderForTest(order) {
    const byId = new Map(getCards().map((card) => [cardId(card), card]));
    for (const id of order) {
      const card = byId.get(id);
      if (card) track.appendChild(card);
    }
    state.cards = getCards();
    renumberCards();
    measure();
  }

  measure();
  focusCard(focusDeckId);
  render();
  setStatus('idle');
  state.savedOrder = getOrder();

  page.addEventListener('wheel', handleWheel, { passive: false });
  page.addEventListener('pointerdown', handlePointerDown);
  page.addEventListener('pointermove', handlePointerMove);
  page.addEventListener('pointerup', stopPointer);
  page.addEventListener('pointercancel', stopPointer);
  page.addEventListener('click', handleClick, true);
  page.querySelectorAll('[data-gallery-cover-link]').forEach((link) => {
    link.addEventListener('click', transitionToDeck);
    const warm = () => {
      const deckId = link.closest('[data-gallery-card]')?.dataset.deckId;
      if (deckId) window.__WARM_DECK__?.(deckId);
    };
    link.addEventListener('pointerenter', warm);
    link.addEventListener('focus', warm);
    link.addEventListener('pointerdown', warm);
  });
  window.addEventListener('resize', measure);
  window.addEventListener('keydown', handleKeydown);

  return {
    destroy() {
      window.cancelAnimationFrame(state.raf);
      clearLongPress();
      page.removeEventListener('wheel', handleWheel);
      page.removeEventListener('pointerdown', handlePointerDown);
      page.removeEventListener('pointermove', handlePointerMove);
      page.removeEventListener('pointerup', stopPointer);
      page.removeEventListener('pointercancel', stopPointer);
      page.removeEventListener('click', handleClick, true);
      window.removeEventListener('resize', measure);
      window.removeEventListener('keydown', handleKeydown);
    },
    getOrder,
    getState() {
      return state.saveState;
    },
    setOrderForTest,
    saveOrderForTest(order) {
      queueSave(order);
    },
    async waitForIdleForTest(timeout = 3000) {
      const start = Date.now();
      while (state.saveState === 'saving' || state.saveState === 'dirty' || state.pendingOrder) {
        if (Date.now() - start > timeout) throw new Error('Timed out waiting for gallery save.');
        await sleep(25);
      }
      return state.saveState;
    },
  };
}
