import { defineCode } from '../codeDef';

/** A played component chose more than its text allows ("1 or 2"). Made by its play; params `limit` and `chosen`. */
export default defineCode('choiceOverLimit', {
  rules: ['2.6'],
  step: 'component',
  text: {
    ru: 'Выбрано {{chosen}}, а карта позволяет не больше {{limit}}.',
    en: 'The card allows at most {{limit}}, and {{chosen}} are chosen.',
  },
});
