import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode } from '../../../types';
import { bench, componentAction, HOME, NEAR, quote } from '../kit';
import { id } from './star_forge';

uiBench();

// "... in a system that contains 1 or more of your war suns."
// Checks: Star Forge aimed at a system without a war sun shows a standing warning.
// Why the check is NOT redundant here: the war sun is the ability's own condition (Muaat, Star Forge 1).
test('ability:star_forge aimed at a system without a war sun shows a standing warning', () => {
  const play = componentAction(id, { choices: { systemId: NEAR, unit: 'destroyer' } });
  const table = bench({ faction: 'muaat', expansions: ['pok'], units: { [HOME]: { warsun: 1 } }, entries: [play] });
  quote(table.pack, id, 'in a system that contains 1 or more of your war suns');
  showWarnings(table, play);
  expectShownStanding('warSunAbsent' as AnyWarningCode);
});
