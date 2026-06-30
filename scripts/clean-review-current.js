import { rm } from 'node:fs/promises';
import { deckId, deckReviewPath } from './review-paths.js';

const currentDir = deckReviewPath('current');
await rm(currentDir, { recursive: true, force: true });
console.log(`Cleaned review/current for ${deckId}: ${currentDir}`);

