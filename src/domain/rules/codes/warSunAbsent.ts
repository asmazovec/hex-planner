import { defineCode } from '../codeDef';

/**
 * An ability aimed at a system without a war sun of the player's (Star Forge). No LRR point: the ability's own text
 * is the rule. Made by its play.
 */
export default defineCode('warSunAbsent', {
  rules: ['ability:star_forge'],
  step: 'component',
  text: {
    ru: 'В выбранной системе нет вашего Военного Солнца.',
    en: 'No war sun of yours stands in the chosen system.',
  },
});
