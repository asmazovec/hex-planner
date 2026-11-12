import { defineCode } from '../codeDef';

/**
 * A played card whose own condition does not hold (the timing and the conditions printed on it, LRR 2.6). Made by
 * the card's play; params `id` and `name`.
 */
export default defineCode('playCondition', {
  rules: ['2.6'],
  step: 'component',
  text: {
    ru: 'Условие карты {{name}} не выполнено.',
    en: 'The condition of {{name}} is not met.',
  },
});
