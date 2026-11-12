import { defineCode } from '../codeDef';

/**
 * A planet chosen for an ability that gains control of one without a landing, which the ability's text does not allow
 * (Mecatol Rex, a planet with units on it, one not in a system adjacent to a planet of the player: Peace Accords).
 * The component's own text is the rule. Made by its play; param `planet` (the planet id).
 */
export default defineCode('planetNotGainable', {
  rules: ['ability:peace_accords'],
  step: 'component',
  text: {
    ru: 'Планету {{planet}} нельзя получить этой способностью: это не Mecatol Rex, на ней не должно быть юнитов, а её система должна быть рядом с системой вашей планеты.',
    en: 'The planet {{planet}} cannot be gained by this ability: it must not be Mecatol Rex, must hold no units, and must be in a system adjacent to a planet you control.',
  },
});
