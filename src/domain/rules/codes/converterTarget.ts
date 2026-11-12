import { defineCode } from '../codeDef';

/**
 * Stellar Converter aimed at a planet its text does not allow: one the player controls (note 3), a home planet, a
 * legendary one or Mecatol Rex. The component's own text is the rule. Made by the play of relic:stellarconverter;
 * `planetId` is the planet, `reason` why.
 */
export default defineCode('converterTarget', {
  rules: ['relic:stellarconverter'],
  step: 'component',
  text: {
    ru: 'Планета {{planet}} не может быть целью Stellar Converter.',
    en: '{{planet}} cannot be the target of the Stellar Converter.',
  },
});
