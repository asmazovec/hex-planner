import { defineCode } from '../codeDef';

/**
 * More action cards in hand than the hand limit after an entry drew some. LRR 2.4: "a maximum of seven action cards";
 * 2.4.1: a game effect can change the number (`handLimit` of the count). Params `cards` and `limit`.
 */
export default defineCode('handOverLimit', {
  rules: ['2.4', '2.4.1'],
  step: 'component',
  text: {
    ru: 'В руке {{cards}} карт действий, а предел руки {{limit}}.',
    en: 'The hand holds {{cards}} action cards, and the hand limit is {{limit}}.',
  },
});
