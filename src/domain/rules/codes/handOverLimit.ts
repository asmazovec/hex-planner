import { defineCode } from '../codeDef';

/**
 * A hand over its limit. LRR 2.4: a hand holds at most seven action cards; 2.4.1: a game effect can change that
 * (the `handLimit` point of the count). Made by the replay after an entry that added cards to the hand; params
 * `cards` (in hand after the entry) and `limit`.
 */
export default defineCode('handOverLimit', {
  rules: ['2.4', '2.4.1'],
  step: 'round',
  text: {
    ru: 'В руке {{cards}} карт действий при пределе {{limit}}: лишние сбрасываются сразу.',
    en: 'The hand holds {{cards}} action cards and the limit is {{limit}}: the excess is discarded at once.',
  },
});
