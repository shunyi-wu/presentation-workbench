import { test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deckId, resetReviewCurrent, slideUrl, waitForDeck } from './deck-test-utils.js';

test('export a review gallery for all slides', async ({ page }) => {
  const outputDir = await resetReviewCurrent();
  await mkdir(outputDir, { recursive: true });
  await page.goto(slideUrl(1));
  const count = await waitForDeck(page);
  const files = [];

  for (let i = 1; i <= count; i += 1) {
    await page.goto(slideUrl(i));
    await waitForDeck(page);
    await page.addStyleTag({ content: '.nav { display: none !important; }' });
    const filename = `slide-${String(i).padStart(2, '0')}.png`;
    await page.locator('.slide.active').screenshot({ path: path.join(outputDir, filename), animations: 'disabled' });
    files.push(filename);
  }

  const cards = files.map((file, index) => `<figure><img src="${file}" alt="Slide ${index + 1}"><figcaption>Slide ${index + 1}</figcaption></figure>`).join('\n');
  const generated = new Date().toISOString();
  const html = `<!doctype html><meta charset="utf-8"><title>${deckId} Review</title><style>body{margin:24px;background:#222;color:#fff;font:16px system-ui}header{margin-bottom:18px;color:#bbb}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}figure{margin:0}img{display:block;width:100%;background:#fff}figcaption{margin-top:8px;color:#bbb}@media(max-width:1000px){main{grid-template-columns:1fr}}</style><header>Deck: ${deckId}<br>Generated: ${generated}</header><main>${cards}</main>`;
  await writeFile(path.join(outputDir, 'index.html'), html, 'utf8');
});
