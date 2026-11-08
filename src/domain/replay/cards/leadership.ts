/** Leadership (LRR 52): three tokens on the primary, more bought with influence on both sides; the secondary spends no token. */
import type { CardHandler } from './handler';

export const LEADERSHIP_FREE = 3;
const INFLUENCE_PER_TOKEN = 3;

export const leadership: CardHandler = {
  freeSecondary: true,
  cost: entry => ({ kind: 'influence', amount: (entry.effects?.boughtTokens ?? 0) * INFLUENCE_PER_TOKEN }),
  freeTokens: entry => (entry.type === 'strategic' ? LEADERSHIP_FREE : 0) + (entry.effects?.boughtTokens ?? 0),
};
