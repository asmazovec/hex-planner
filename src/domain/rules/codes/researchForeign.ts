import { defineCode } from '../codeDef';

/**
 * A faction technology of another faction is researched. LRR 90.10: to research, a player gains the card from their own
 * technology deck, which holds the generic technologies and their faction's own. Params: `id`, `name`.
 */
export default defineCode('researchForeign', {
  rules: ['90.10'],
  step: 'card',
  text: {
    ru: 'Технологию {{name}} другой фракции исследовать нельзя: технологию берут из своей колоды технологий.',
    en: '{{name}} is a technology of another faction; research takes a card from your own technology deck.',
  },
});
