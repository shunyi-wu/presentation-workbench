import { rm } from 'node:fs/promises';
import path from 'node:path';

export const deckId = process.env.DECK_ID || 'placeholder-blank-01';

export function slideUrl(slide) {
  return `/?deck=${encodeURIComponent(deckId)}&slide=${slide}`;
}

export function deckReviewDir(...parts) {
  return path.resolve('decks', deckId, 'review', ...parts);
}

export async function waitForDeck(page) {
  await page.waitForFunction(() => Number.isInteger(window.__SLIDE_COUNT__) && window.__SLIDE_COUNT__ > 0);
  await page.waitForSelector('.slide.active');
  return page.evaluate(() => window.__SLIDE_COUNT__);
}

export async function resetReviewCurrent() {
  const outputDir = deckReviewDir('current');
  await rm(outputDir, { recursive: true, force: true });
  return outputDir;
}
