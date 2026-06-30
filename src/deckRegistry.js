import workbenchOrder from './workbenchOrder.json' with { type: 'json' };

const deckLoaders = {
  'workbench-usage-guide': () => import('../decks/workbench-usage-guide/deck.config.js'),
  'placeholder-blank-01': () => import('../decks/placeholder-blank-01/deck.config.js'),
  'placeholder-blank-02': () => import('../decks/placeholder-blank-02/deck.config.js'),
  'placeholder-blank-03': () => import('../decks/placeholder-blank-03/deck.config.js'),
  'placeholder-blank-04': () => import('../decks/placeholder-blank-04/deck.config.js'),
};

export const deckCatalogEntries = [
  {
    id: 'workbench-usage-guide',
    title: '工作台使用说明',
    kind: '说明占位',
    updatedAt: '2026-06-30T00:00:00+08:00',
    status: '占位',
    runnable: true,
    legacy: false,
    locality: 'deck-local',
    description: '预留给 Presentation Workbench 使用说明的 deck，目前只放空白占位页。',
  },
  {
    id: 'placeholder-blank-01',
    title: '占位空白 PPT 01',
    kind: '占位空白 PPT',
    updatedAt: '2026-06-30T00:00:00+08:00',
    status: '占位',
    runnable: true,
    legacy: false,
    locality: 'deck-local',
    description: '用于展示工作台能收纳多个汇报；没有实际演示内容。',
  },
  {
    id: 'placeholder-blank-02',
    title: '占位空白 PPT 02',
    kind: '占位空白 PPT',
    updatedAt: '2026-06-30T00:00:00+08:00',
    status: '占位',
    runnable: true,
    legacy: false,
    locality: 'deck-local',
    description: '用于展示工作台能收纳多个汇报；没有实际演示内容。',
  },
  {
    id: 'placeholder-blank-03',
    title: '占位空白 PPT 03',
    kind: '占位空白 PPT',
    updatedAt: '2026-06-30T00:00:00+08:00',
    status: '占位',
    runnable: true,
    legacy: false,
    locality: 'deck-local',
    description: '用于展示工作台能收纳多个汇报；没有实际演示内容。',
  },
  {
    id: 'placeholder-blank-04',
    title: '占位空白 PPT 04',
    kind: '占位空白 PPT',
    updatedAt: '2026-06-30T00:00:00+08:00',
    status: '占位',
    runnable: true,
    legacy: false,
    locality: 'deck-local',
    description: '用于展示工作台能收纳多个汇报；没有实际演示内容。',
  },
];

export function normalizeWorkbenchOrder(order = workbenchOrder, entries = deckCatalogEntries) {
  const decksById = new Map(entries.map((deck) => [deck.id, deck]));
  const seen = new Set();
  const savedIds = Array.isArray(order) ? order : [];
  const savedDecks = [];

  for (const id of savedIds) {
    if (typeof id !== 'string' || seen.has(id) || !decksById.has(id)) continue;
    seen.add(id);
    savedDecks.push(decksById.get(id));
  }

  const newDecks = entries.filter((deck) => !seen.has(deck.id));
  return [...newDecks, ...savedDecks];
}

export const deckCatalog = normalizeWorkbenchOrder();

export const defaultDeckId = deckCatalog[0]?.id || 'workbench-usage-guide';

export function getDeckId(params = new URLSearchParams(location.search)) {
  return params.get('deck') || window.__DECK_ID__ || defaultDeckId;
}

export async function loadDeck(deckId) {
  const load = deckLoaders[deckId];
  if (!load) {
    const available = Object.keys(deckLoaders).join(', ');
    throw new Error(`Unknown deck "${deckId}". Available decks: ${available}`);
  }

  const module = await load();
  return module.deckConfig;
}
