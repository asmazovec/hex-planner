import { defineCode } from '../codeDef';

/** Relic fragments spent without reaching the number a relic costs (LRR 73.1, 35.9.1). Made by the play of a fragment that is spent. */
export default defineCode('relicFragmentsShort', {
  rules: ['73.1', '35.9.1'],
  step: 'component',
  text: {
    ru: 'Для реликвии не хватает фрагментов реликвии.',
    en: 'Not enough relic fragments to take a relic.',
  },
});
