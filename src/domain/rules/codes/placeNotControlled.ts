import { defineCode } from '../codeDef';

/**
 * An ability or a card places units on a planet the player does not control. LRR 67.4.1: units are placed only on
 * planets the player controls. Made by `placeOnPlanet` (replay/invasion.ts); `planetId` is the planet.
 */
export default defineCode('placeNotControlled', {
  rules: ['67.4.1'],
  step: 'component',
  text: {
    ru: 'Юниты помещаются только на планету, которую вы контролируете, а {{planet}} не ваша.',
    en: 'Units are placed only on a planet you control, and {{planet}} is not yours.',
  },
});
