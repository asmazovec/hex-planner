import { defineCode } from '../codeDef';

/**
 * A technology taken from a player who is not a neighbour (LRR 60), or who does not own it (Plagiarize). The card's own
 * text is the rule. Made by its play; params `id`, `name`.
 */
export default defineCode('techNotFromNeighbor', {
  rules: ['actionCard:plagiarize', '60'],
  step: 'component',
  text: {
    ru: 'Технологии {{name}} нет у соседа: карта берёт только технологии соседей.',
    en: '{{name}} is not owned by a neighbor: the card takes only a neighbor\'s technology.',
  },
});
