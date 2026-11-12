import { defineCode } from '../codeDef';

/**
 * Infantry produced when only space docks that may not produce infantry have PRODUCTION in the system. LRR 68.1 note
 * 4: "Production value from Arborec space docks cannot be used to produce infantry, even if the Arborec player
 * controls other units that have Production in the same system." Made by the production step; a dock's leave to
 * produce infantry is the point `dockInfantry` (base 1; 0 forbids), so the step names no faction.
 */
export default defineCode('dockInfantry', {
  rules: ['68.1', '79.1'],
  step: 'production',
  text: {
    ru: 'Космодоки не могут производить пехоту, а в системе нет другого юнита с производством: {{system}}.',
    en: 'The space docks cannot produce infantry, and no other unit with Production is in {{system}}.',
  },
});
