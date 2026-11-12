import { defineCode } from '../codeDef';

/**
 * A unit landed, produced or placed on a planet that has the exploration card Demilitarized Zone attached ("Units
 * cannot be committed to, produced on, or placed on this planet", 12.1, 35.8). Made by the card's own check, for every
 * player, from the entry after the one that attached it. Params: `planetId` of the planet.
 */
export default defineCode('planetDemilitarized', {
  rules: ['12.1', '35.8'],
  step: 'invasion',
  text: {
    ru: 'К планете {{planet}} присоединена карта: на неё нельзя высаживать, производить или ставить юниты.',
    en: 'A card attached to {{planet}} bars units: they cannot be committed to, produced on or placed on it.',
  },
});
