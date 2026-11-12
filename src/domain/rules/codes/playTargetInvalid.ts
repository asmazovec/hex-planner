import { defineCode } from '../codeDef';

/**
 * The target a played component was given is not one its text allows (a home planet for Mercenary Contract, a planet
 * with no technology specialty for Brilliance). Made by its play; params `name` and `reason` (a short phrase).
 */
export default defineCode('playTargetInvalid', {
  rules: ['2.6'],
  step: 'component',
  text: {
    ru: 'Выбранная цель не подходит для {{name}}: {{reason}}.',
    en: 'The chosen target does not fit {{name}}: {{reason}}.',
  },
});
