import { defineCode } from '../codeDef';

/**
 * A technology whose own text says it cannot be researched (the Obsidian's Planesplitter and Parasite) is researched.
 * LRR 90.9: research comes from the Technology card or another effect; 90.5: such a technology is only gained.
 * Params: `id`, `name`.
 */
export default defineCode('researchUnavailable', {
  rules: ['90.9', '90.5'],
  step: 'card',
  text: {
    ru: 'Технологию {{name}} нельзя исследовать, её можно только получить.',
    en: '{{name}} cannot be researched; it can only be gained.',
  },
});
