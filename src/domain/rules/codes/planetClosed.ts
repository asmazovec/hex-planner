import { defineCode } from '../codeDef';

/**
 * A unit landed, produced or placed on a planet that a law in play closes (Demilitarized Zone: "Player's units cannot
 * land, be produced, or be placed on this planet", 7.2, 8.20). Made by the law's own check, for every player; nothing
 * lifts it. Params: `planetId` of the closed planet.
 */
export default defineCode('planetClosed', {
  rules: ['7.2', '8.20'],
  step: 'invasion',
  text: {
    ru: 'Планета {{planet}} закрыта законом: на неё нельзя высаживать, производить или ставить юниты.',
    en: 'A law in play closes {{planet}}: units cannot land, be produced or be placed there.',
  },
});
