import { defineCode } from '../codeDef';

/**
 * A war sun produced. Units, War Sun 1: "A player without the war sun unit upgrade technology cannot produce, place or
 * have a war sun on the board for any reason." The step never names the technology: every war sun produced is warned
 * of, and the technology (or the Muaat's sheet) waives it. `systemId` is the system it is produced in.
 */
export default defineCode('warSunLocked', {
  rules: ['War Sun 1', '67.1'],
  step: 'production',
  text: {
    ru: 'Без технологии «Военное солнце» нельзя производить или иметь военное солнце: {{system}}.',
    en: 'A player without the war sun unit upgrade technology cannot produce a war sun in {{system}}.',
  },
});
