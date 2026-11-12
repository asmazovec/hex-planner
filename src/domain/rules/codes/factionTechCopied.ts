import { defineCode } from '../codeDef';

/** A copied technology that is a faction technology (Plagiarize). The card's own text is the rule. Made by its play. */
export default defineCode('factionTechCopied', {
  rules: ['actionCard:plagiarize'],
  step: 'component',
  text: {
    ru: 'Фракционную технологию копировать нельзя.',
    en: 'A faction technology cannot be copied.',
  },
});
