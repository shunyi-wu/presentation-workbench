import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deckCatalogEntries, normalizeWorkbenchOrder } from '../src/deckRegistry.js';
import workbenchOrder from '../src/workbenchOrder.json' with { type: 'json' };

const orderPath = path.resolve('src/workbenchOrder.json');

function expectedOrder(order = workbenchOrder, entries = deckCatalogEntries) {
  return normalizeWorkbenchOrder(order, entries).map((deck) => deck.id);
}

async function restoreOrderFile(original) {
  await writeFile(orderPath, original, 'utf8');
}

test.describe('workbench gallery', () => {
  let originalOrderFile;

  test.beforeAll(async () => {
    originalOrderFile = await readFile(orderPath, 'utf8');
  });

  test.afterEach(async () => {
    await restoreOrderFile(originalOrderFile);
  });

  test.afterAll(async () => {
    await restoreOrderFile(originalOrderFile);
  });

  test('default order follows order file normalized against registry', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-workbench-gallery]')).toBeVisible();

    const order = await page.evaluate(() => window.__WORKBENCH_GALLERY__.getOrder());
    expect(order).toEqual(expectedOrder());
  });

  test('normalization places new registry decks first and ignores stale order ids', () => {
    const entries = [
      { id: 'new-deck' },
      ...deckCatalogEntries,
    ];
    const order = ['missing-deck', deckCatalogEntries[1].id, deckCatalogEntries[1].id, deckCatalogEntries[0].id];

    expect(expectedOrder(order, entries)).toEqual([
      'new-deck',
      deckCatalogEntries[2].id,
      deckCatalogEntries[3].id,
      deckCatalogEntries[4].id,
      deckCatalogEntries[1].id,
      deckCatalogEntries[0].id,
    ]);
  });

  test('clicking the large plate does not navigate', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.locator('[data-gallery-card]').first();
    const before = page.url();

    await firstCard.locator('[data-gallery-plate]').click({ position: { x: 60, y: 60 } });
    await page.waitForTimeout(350);

    expect(page.url()).toBe(before);
    await expect(page.locator('[data-workbench-gallery]')).toBeVisible();
  });

  test('clicking the cover opens the deck', async ({ page }) => {
    await page.goto('/');
    const firstId = expectedOrder()[0];
    await page.evaluate(() => {
      window.__NO_FULL_RELOAD_MARKER__ = crypto.randomUUID();
    });
    const marker = await page.evaluate(() => window.__NO_FULL_RELOAD_MARKER__);

    await page.locator('[data-gallery-cover-link]').first().click();
    await page.waitForFunction(() => window.__DECK_ID__);

    expect(page.url()).toContain(`deck=${encodeURIComponent(firstId)}`);
    expect(await page.evaluate(() => window.__DECK_ID__)).toBe(firstId);
    expect(await page.evaluate(() => window.__NO_FULL_RELOAD_MARKER__)).toBe(marker);
  });

  test('browser back and desktop button return to workbench', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-gallery-cover-link]').first().click();
    await page.waitForFunction(() => window.__DECK_ID__);
    await expect(page.locator('[data-deck]')).toBeVisible();

    await page.goBack();
    await expect(page.locator('[data-workbench-gallery]')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    await page.locator('[data-gallery-cover-link]').first().click();
    await page.waitForFunction(() => window.__DECK_ID__);
    await page.evaluate(() => {
      window.__NO_FULL_RELOAD_MARKER__ = crypto.randomUUID();
    });
    const marker = await page.evaluate(() => window.__NO_FULL_RELOAD_MARKER__);
    await page.locator('[data-home]').click();
    await expect(page.locator('[data-workbench-gallery]')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => window.__NO_FULL_RELOAD_MARKER__)).toBe(marker);
  });

  test('desktop return focuses the current deck in the gallery', async ({ page }) => {
    const targetId = expectedOrder().at(-1);
    await page.goto(`/?deck=${encodeURIComponent(targetId)}&slide=1`);
    await page.waitForFunction(() => window.__DECK_ID__);

    await page.locator('[data-home]').click();
    await expect(page.locator('[data-workbench-gallery]')).toBeVisible();

    const cardCenter = await page.locator(`[data-deck-id="${targetId}"]`).evaluate((card) => {
      const rect = card.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
    expect(cardCenter).toBeGreaterThan(0);
    expect(cardCenter).toBeLessThan(1280);
  });

  test('annotation shortcut toggles the toolbar', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-gallery-cover-link]').first().click();
    await page.waitForFunction(() => window.__DECK_ID__);

    const toolbar = page.locator('[data-annotation-toolbar]');
    await expect(toolbar).toBeHidden();

    await page.keyboard.press('a');
    await expect(toolbar).toBeVisible();
    await expect(page.locator('[data-annotate]')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('a');
    await expect(toolbar).toBeHidden();
    await expect(page.locator('[data-annotate]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('arrow keys keep navigating while annotation is open', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-gallery-cover-link]').first().click();
    await page.waitForFunction(() => window.__DECK_ID__);

    await page.keyboard.press('a');
    await expect(page.locator('[data-annotation-toolbar]')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-count]')).toHaveText(/2 \//);
    await expect(page.locator('[data-annotation-toolbar]')).toBeVisible();
  });

  test('dragging blank stage pans the gallery without saving order', async ({ page }) => {
    const requests = [];
    await page.route('/__workbench/order', async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ json: { ok: true, order: route.request().postDataJSON() } });
    });

    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto('/');
    const before = await page.locator('[data-gallery-track]').evaluate((node) => getComputedStyle(node).transform);

    await page.mouse.move(820, 840);
    await page.mouse.down();
    await page.mouse.move(360, 840, { steps: 10 });
    await page.mouse.up();

    await expect.poll(async () => page.locator('[data-gallery-track]').evaluate((node) => getComputedStyle(node).transform)).not.toBe(before);
    expect(requests).toHaveLength(0);
  });

  test('hover states separate plate highlight from cover zoom', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('[data-gallery-card]').first();
    const cover = card.locator('[data-gallery-cover-link]');
    const plate = card.locator('[data-gallery-plate]');

    await plate.hover({ position: { x: 70, y: 70 } });
    const plateHover = await cover.evaluate((node) => getComputedStyle(node).transform);

    await cover.hover();
    await expect.poll(async () => cover.evaluate((node) => getComputedStyle(node).transform)).not.toBe(plateHover);
    const coverHover = await cover.evaluate((node) => getComputedStyle(node).transform);
    const borderColor = await plate.evaluate((node) => getComputedStyle(node).borderColor);

    expect(coverHover).not.toBe(plateHover);
    expect(borderColor).not.toBe('rgba(240, 236, 220, 0.13)');
  });

  test('gallery cards keep copy and cover separated on wide desktop', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1120 });
    await page.goto('/');

    const problems = await page.locator('[data-gallery-card]').evaluateAll((cards) => cards.flatMap((card) => {
      const copy = card.querySelector('.workbench-gallery-copy');
      const cover = card.querySelector('[data-gallery-cover-link]');
      if (!copy || !cover) return [];
      const copyRect = copy.getBoundingClientRect();
      const coverRect = cover.getBoundingClientRect();
      const plateRect = card.querySelector('[data-gallery-plate]').getBoundingClientRect();
      const overlaps = copyRect.right > coverRect.left - 12 && copyRect.bottom > coverRect.top && copyRect.top < coverRect.bottom;
      const underfilled = plateRect.height < window.innerHeight * 0.48;
      const crampedBottom = window.innerHeight - plateRect.bottom < 96;
      return overlaps || underfilled || crampedBottom ? [{
        id: card.dataset.deckId,
        overlaps,
        underfilled,
        crampedBottom,
        copyRight: copyRect.right,
        coverLeft: coverRect.left,
        plateHeight: plateRect.height,
        viewportHeight: window.innerHeight,
        bottomGap: window.innerHeight - plateRect.bottom,
      }] : [];
    }));

    expect(problems).toEqual([]);
  });

  test('long press drag submits order only after release', async ({ page }) => {
    const requests = [];
    await page.route('/__workbench/order', async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ json: { ok: true, order: route.request().postDataJSON() } });
    });

    await page.goto('/');
    const cards = page.locator('[data-gallery-card]');
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();

    await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(380);
    await page.mouse.move(second.x + second.width * 0.75, second.y + second.height / 2, { steps: 8 });
    expect(requests).toHaveLength(0);
    await page.mouse.up();

    await page.waitForFunction(() => window.__WORKBENCH_GALLERY__.getState() === 'saved');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual(await page.evaluate(() => window.__WORKBENCH_GALLERY__.getOrder()));
  });

  test('dev order endpoint rejects invalid payloads', async ({ request }) => {
    const unknown = await request.post('/__workbench/order', { data: ['not-a-deck'] });
    expect(unknown.status()).toBe(400);

    const duplicate = await request.post('/__workbench/order', { data: [deckCatalogEntries[0].id, deckCatalogEntries[0].id] });
    expect(duplicate.status()).toBe(400);

    const notArray = await request.post('/__workbench/order', { data: { order: [deckCatalogEntries[0].id] } });
    expect(notArray.status()).toBe(400);
  });

  test('dev order endpoint accepts a partial valid order and prepends missing registry ids', async ({ request }) => {
    const response = await request.post('/__workbench/order', { data: [deckCatalogEntries[0].id] });
    expect(response.status()).toBe(200);

    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.order).toEqual(expectedOrder([deckCatalogEntries[0].id]));
  });
});
