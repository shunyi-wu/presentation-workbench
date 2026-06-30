const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;
const STORAGE_PREFIX = 'presentation-workbench-annotations-v1';

const COLORS = ['#e5484d', '#f2b705', '#15a085', '#2474c6', '#172327', '#ffffff'];

const ICONS = {
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z"/><path d="M13.5 7.5l3 3"/></svg>',
  marker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h14"/><path d="M7 16l8.5-8.5a2.1 2.1 0 0 1 3 3L10 19H7v-3z"/><path d="M13.5 9.5l3 3"/></svg>',
  eraser: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15l7.5-7.5a2.1 2.1 0 0 1 3 0l3 3a2.1 2.1 0 0 1 0 3L13 19H9l-4-4z"/><path d="M11 19h8"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8H4v5"/><path d="M4 8l5.5 5.5A6.5 6.5 0 1 0 15 5"/></svg>',
  clear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14"/><path d="M9 6V4h6v2"/><path d="M8 9l1 11h6l1-11"/></svg>',
};

function loadAnnotations(storage, key) {
  try {
    return JSON.parse(storage?.getItem(key)) || {};
  } catch {
    return {};
  }
}

function saveAnnotations(storage, key, annotations) {
  try {
    storage.setItem(key, JSON.stringify(annotations));
  } catch {
    // Storage can fail in private contexts or after quota pressure; drawing still works in memory.
  }
}

function getStorage(win) {
  try {
    return win.localStorage;
  } catch {
    return null;
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function clampToCanvas(point) {
  return {
    x: Math.max(0, Math.min(CANVAS_WIDTH, point.x)),
    y: Math.max(0, Math.min(CANVAS_HEIGHT, point.y)),
  };
}

function isTextInput(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

function renderToolButton(tool, label) {
  return `
    <button type="button" class="annotation-tool" data-annotation-tool="${tool}" aria-label="${label}" title="${label}">
      ${ICONS[tool]}
    </button>`;
}

function renderToolbar() {
  const swatches = COLORS.map((color) => `
    <button
      type="button"
      class="annotation-swatch"
      style="--swatch: ${color}"
      data-annotation-color="${color}"
      aria-label="颜色 ${color}"
      title="颜色 ${color}"
    ></button>`).join('');

  return `
    <div class="annotation-toolbar" data-annotation-toolbar role="toolbar" aria-label="标注工具" hidden>
      <div class="annotation-toolset" aria-label="工具">
        ${renderToolButton('pen', '画笔')}
        ${renderToolButton('marker', '荧光笔')}
        ${renderToolButton('eraser', '橡皮')}
      </div>
      <div class="annotation-swatches" aria-label="颜色">${swatches}</div>
      <label class="annotation-size" title="线宽">
        <span aria-hidden="true"></span>
        <input type="range" min="2" max="44" step="1" data-annotation-width aria-label="线宽">
      </label>
      <div class="annotation-actions" aria-label="操作">
        <button type="button" data-annotation-undo aria-label="撤销" title="撤销">${ICONS.undo}</button>
        <button type="button" data-annotation-clear aria-label="清空当前页" title="清空当前页">${ICONS.clear}</button>
      </div>
    </div>`;
}

export function attachAnnotationLayer(root = document) {
  const win = root.defaultView || window;
  const deck = root.querySelector('[data-deck]');
  if (!deck) return null;
  if (deck.dataset.annotationLayerAttached === 'true') return null;
  deck.dataset.annotationLayerAttached = 'true';

  const stage = deck.closest('.stage') || root.body;
  const deckId = stage.dataset.deckId || 'unknown-deck';
  const labId = new URLSearchParams(win.location.search).get('lab');
  const storageKey = `${STORAGE_PREFIX}:${deckId}${labId ? `:${labId}` : ''}`;
  const storage = getStorage(win);
  const canvas = root.createElement('canvas');
  const context = canvas.getContext('2d');
  const annotations = loadAnnotations(storage, storageKey);
  const state = {
    enabled: false,
    tool: 'pen',
    color: COLORS[0],
    widths: {
      pen: 6,
      marker: 24,
      eraser: 30,
    },
    stroke: null,
  };

  canvas.className = 'annotation-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.annotationTool = state.tool;
  deck.append(canvas);
  stage.insertAdjacentHTML('beforeend', renderToolbar());

  const toolbar = stage.querySelector('[data-annotation-toolbar]');
  const toggleButton = root.querySelector('[data-annotate]');
  const widthInput = toolbar.querySelector('[data-annotation-width]');
  const slides = [...root.querySelectorAll('[data-slide]')];

  function activeSlideKey() {
    const active = root.querySelector('[data-slide].active');
    const index = Math.max(0, slides.indexOf(active));
    return String(index + 1);
  }

  function currentWidth() {
    return state.widths[state.tool];
  }

  function currentStrokes() {
    const key = activeSlideKey();
    annotations[key] ||= [];
    return annotations[key];
  }

  function persist() {
    saveAnnotations(storage, storageKey, annotations);
  }

  function syncCanvasResolution() {
    const ratio = Math.max(1, Math.min(3, win.devicePixelRatio || 1));
    const width = Math.round(CANVAS_WIDTH * ratio);
    const height = Math.round(CANVAS_HEIGHT * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawStroke(stroke) {
    const points = stroke.points || [];
    if (!points.length) return;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = stroke.width;
    context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    context.globalAlpha = stroke.tool === 'marker' ? 0.34 : 1;
    context.strokeStyle = stroke.tool === 'eraser' ? '#000000' : stroke.color;
    context.fillStyle = context.strokeStyle;

    if (points.length === 1) {
      context.beginPath();
      context.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
      return;
    }

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i += 1) {
      const next = midpoint(points[i], points[i + 1]);
      context.quadraticCurveTo(points[i].x, points[i].y, next.x, next.y);
    }
    const last = points[points.length - 1];
    context.lineTo(last.x, last.y);
    context.stroke();
    context.restore();
  }

  function render() {
    syncCanvasResolution();
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const strokes = annotations[activeSlideKey()] || [];
    strokes.forEach(drawStroke);
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return clampToCanvas({
      x: ((event.clientX - rect.left) * CANVAS_WIDTH) / rect.width,
      y: ((event.clientY - rect.top) * CANVAS_HEIGHT) / rect.height,
    });
  }

  function updateControls() {
    toolbar.querySelectorAll('[data-annotation-tool]').forEach((button) => {
      const selected = button.dataset.annotationTool === state.tool;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    toolbar.querySelectorAll('[data-annotation-color]').forEach((button) => {
      const selected = button.dataset.annotationColor === state.color;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    widthInput.value = String(currentWidth());
    canvas.dataset.annotationTool = state.tool;
  }

  function setEnabled(enabled) {
    state.enabled = enabled;
    canvas.classList.toggle('is-active', enabled);
    deck.classList.toggle('is-annotating', enabled);
    toolbar.hidden = !enabled;
    toggleButton?.classList.toggle('is-active', enabled);
    toggleButton?.setAttribute('aria-pressed', String(enabled));
    updateControls();
  }

  function setTool(tool) {
    state.tool = tool;
    updateControls();
  }

  function undo() {
    const strokes = currentStrokes();
    if (!strokes.length) return;
    strokes.pop();
    persist();
    render();
  }

  function clearCurrentSlide() {
    const key = activeSlideKey();
    if (!annotations[key]?.length) return;
    annotations[key] = [];
    persist();
    render();
  }

  function beginStroke(event) {
    if (!state.enabled) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    state.stroke = {
      tool: state.tool,
      color: state.color,
      width: currentWidth(),
      points: [pointFromEvent(event)],
    };
    currentStrokes().push(state.stroke);
    render();
  }

  function extendStroke(event) {
    if (!state.stroke) return;

    event.preventDefault();
    const point = pointFromEvent(event);
    const points = state.stroke.points;
    if (distance(points[points.length - 1], point) < 1.3) return;
    points.push(point);
    render();
  }

  function finishStroke(event) {
    if (!state.stroke) return;

    if (event?.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    persist();
    state.stroke = null;
  }

  toggleButton?.addEventListener('click', () => setEnabled(!state.enabled));

  toolbar.addEventListener('click', (event) => {
    const toolButton = event.target.closest('[data-annotation-tool]');
    const colorButton = event.target.closest('[data-annotation-color]');
    if (toolButton) setTool(toolButton.dataset.annotationTool);
    if (colorButton) {
      state.color = colorButton.dataset.annotationColor;
      updateControls();
    }
    if (event.target.closest('[data-annotation-undo]')) undo();
    if (event.target.closest('[data-annotation-clear]')) clearCurrentSlide();
  });

  widthInput.addEventListener('input', () => {
    state.widths[state.tool] = Number(widthInput.value);
  });

  canvas.addEventListener('pointerdown', beginStroke);
  canvas.addEventListener('pointermove', extendStroke);
  canvas.addEventListener('pointerup', finishStroke);
  canvas.addEventListener('pointercancel', finishStroke);
  canvas.addEventListener('pointerleave', finishStroke);

  function handleKeydown(event) {
    if (isTextInput(event.target)) return;

    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && key === 'z') {
      if (state.enabled) {
        event.preventDefault();
        event.stopImmediatePropagation();
        undo();
      }
      return;
    }

    if (event.altKey || event.metaKey || event.ctrlKey) return;
    if (key === 'a') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setEnabled(!state.enabled);
      return;
    }
    if (!state.enabled) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setEnabled(false);
    } else if (key === 'p') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setTool('pen');
    } else if (key === 'h') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setTool('marker');
    } else if (key === 'e') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setTool('eraser');
    } else if (event.key === ' ') {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  root.addEventListener('keydown', handleKeydown, true);
  root.addEventListener('slidechange', render);
  win.addEventListener('resize', render);

  setEnabled(false);
  render();

  return {
    render,
    clearCurrentSlide,
    undo,
    setEnabled,
    destroy() {
      root.removeEventListener('keydown', handleKeydown, true);
      root.removeEventListener('slidechange', render);
      win.removeEventListener('resize', render);
    },
  };
}
