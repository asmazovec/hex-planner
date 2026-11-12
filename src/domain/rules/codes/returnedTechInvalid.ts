import { defineCode } from '../codeDef';

/**
 * A technology returned to the deck that the card does not allow: a unit upgrade, a faction technology, or one the
 * player does not own (Divert Funding). The card's own text is the rule. Made by its play; params `id`, `name`.
 */
export default defineCode('returnedTechInvalid', {
  rules: ['actionCard:divert_funding'],
  step: 'component',
  text: {
    ru: 'Вернуть можно только свою нефракционную технологию, не улучшение юнита: {{name}} не подходит.',
    en: 'Only an owned, non-faction technology that is not a unit upgrade can be returned: {{name}} does not qualify.',
  },
});
