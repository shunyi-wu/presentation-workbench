import { cp, mkdir } from 'node:fs/promises';
import { deckId, deckReviewPath } from './review-paths.js';

const name = process.env.CHECKPOINT || new Date().toISOString().replace(/[:.]/g, '-');
const currentDir = deckReviewPath('current');
const checkpointDir = deckReviewPath('checkpoints', name);

await mkdir(deckReviewPath('checkpoints'), { recursive: true });
await cp(currentDir, checkpointDir, { recursive: true, force: true });
console.log(`Created review checkpoint for ${deckId}: ${checkpointDir}`);

