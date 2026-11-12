import { defineCode } from '../codeDef';

/**
 * An exploration card asks for a mech on the planet or an infantry to remove from it, and the player has neither.
 * LRR 35.2: the card is resolved as printed. Made by `exploreCondition` (replay/invasion.ts); `planetId` is the planet.
 */
export default defineCode('explorationCondition', {
  rules: ['35.2'],
  step: 'invasion',
  text: {
    ru: 'Условие карты исследования не выполнено: на {{planet}} нет ни меха, ни пехоты, которую можно убрать.',
    en: 'The condition of the exploration card is not met: {{planet}} holds neither a mech nor an infantry to remove.',
  },
});
