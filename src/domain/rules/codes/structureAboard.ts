import { defineCode } from '../codeDef';

/**
 * A structure taken on board a ship. LRR 85.3: "Structures cannot move or be transported." Made by the transport
 * step for every place a flight takes a structure from; `from` is the source system of the flight, `planetId` the
 * planet (none for a structure taken from a space area), `unit` the structure.
 */
export default defineCode('structureAboard', {
  rules: ['85.3', '95.1'],
  step: 'transport',
  text: {
    ru: 'Здания не перемещаются и не перевозятся, а на борт взято: {{unit}}.',
    en: 'Structures cannot move or be transported, and one is taken on board: {{unit}}.',
  },
});
