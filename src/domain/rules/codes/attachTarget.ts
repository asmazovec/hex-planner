import { defineCode } from '../codeDef';

/**
 * A card is attached to a planet its text does not allow: one the player does not control, a home planet or a
 * legendary one. LRR 12.1 (Attach). Made by `attachCard` (replay/invasion.ts); `planetId` is the planet.
 */
export default defineCode('attachTarget', {
  rules: ['12.1'],
  step: 'component',
  text: {
    ru: 'Эту карту нельзя присоединить к планете {{planet}}.',
    en: 'This card cannot be attached to {{planet}}.',
  },
});
