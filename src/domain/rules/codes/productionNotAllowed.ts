import { defineCode } from '../codeDef';

/**
 * Units produced by a strategy card that produces nothing (Construction's primary). LRR 67.1: "To produce a unit, a
 * player must use a unit's Production ability", and 89.5 gives production to the tactical action; Construction places
 * structures only. Made by the card step when the entry carries a production; a law may lift it. The production is
 * still checked against the Production value of its system, as one of a tactical action.
 */
export default defineCode('productionNotAllowed', {
  rules: ['67.1', '89.5'],
  step: 'production',
  text: {
    ru: 'Эта карта стратегии ничего не производит, а юниты внесены: {{system}}.',
    en: 'This strategy card produces nothing, and units are entered as produced in {{system}}.',
  },
});
