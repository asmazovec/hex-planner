import { defineCode } from '../codeDef';

/**
 * An ability or a card places units on a planet the player does not control. LRR 67.4.1: units are placed only on
 * planets the player controls. Made by `placeOnPlanet` (replay/invasion.ts); `planetId` is the planet.
 */
export default defineCode('placeNotControlled', {
  rules: ['67.4.1'],
  step: 'component',
  text: {
    ru: 'Юниты помещаются только на планету, которую игрок контролирует, а {{planet}} не его.',
    en: 'Units are placed only on a planet their player controls, and {{planet}} is not that player\'s.',
  },
});
