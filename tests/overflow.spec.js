import { test, expect } from '@playwright/test';
import { slideUrl, waitForDeck } from './deck-test-utils.js';

test('all slides stay inside the 1600×900 canvas without text overflow', async ({ page }) => {
  await page.goto(slideUrl(1));
  const count = await waitForDeck(page);
  expect(count).toBeGreaterThan(0);

  for (let i = 1; i <= count; i += 1) {
    await page.goto(slideUrl(i));
    await waitForDeck(page);
    const problems = await page.evaluate(() => {
      const slide = document.querySelector('.slide.active');
      const canvas = document.querySelector('[data-deck]').getBoundingClientRect();
      const nodes = [...slide.querySelectorAll('[data-review-box]')];

      return nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const overflowY = node.scrollHeight > node.clientHeight + 2 && style.overflowY !== 'visible';
        const overflowX = node.scrollWidth > node.clientWidth + 2 && style.overflowX !== 'visible';
        const outside = rect.left < canvas.left - 1 || rect.top < canvas.top - 1 || rect.right > canvas.right + 1 || rect.bottom > canvas.bottom + 1;
        if (!overflowY && !overflowX && !outside) return [];
        return [{
          tag: node.tagName,
          className: node.className,
          overflowY,
          overflowX,
          outside,
          client: [node.clientWidth, node.clientHeight],
          scroll: [node.scrollWidth, node.scrollHeight],
          rect: [rect.left, rect.top, rect.right, rect.bottom],
        }];
      });
    });
    expect(problems, `Slide ${i} overflow problems:\n${JSON.stringify(problems, null, 2)}`).toEqual([]);
  }
});
