import path from 'node:path';

export const deckId = process.env.DECK_ID || 'placeholder-blank-01';

export function deckReviewPath(...parts) {
  return path.resolve('decks', deckId, 'review', ...parts);
}
