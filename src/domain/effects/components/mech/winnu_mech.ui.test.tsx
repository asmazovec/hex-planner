import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, land, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { StructureCounts } from '../../../types';
import { bench, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './winnu_mech';

uiBench();

const MAP = { [HOME]: 'r-home', [NEAR]: 'r-target', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
const table = (faction: string, structures?: StructureCounts) => {
  const move = tactical(NEAR, {
    moves: [{ from: HOME, units: { carrier: 1, infantry: 1, mech: 1 } }],
    landings: structures ? [{ planetId: 't1', units: { infantry: 1, mech: 1 }, structures }] : [],
  });
  return { move, table: bench({ faction, expansions: ['pok'], units: { [HOME]: { carrier: 1, infantry: 1, mech: 1 } }, entries: [move], game: { map: MAP } }) };
};

// "After you resolve a tactical action where you gained control of this planet, you may place 1 PDS or 1 Space Dock
//  from your reinforcements on this planet."
// Checks: I land the infantry and the Reclaimer on Target One; the landing then offers a PDS though no ship brought
// one; I put it there, it is written into the landing, and the warning reads as allowed by Reclaimer.
// Why the check is redundant here: the Reclaimer takes the structure from the reinforcements.
test.fails('mech:winnu_mech the landing offers a PDS for the planet the Reclaimer took, and it reads as allowed by Reclaimer', async () => {
  const winnu = table('winnu');
  quote(winnu.table.pack, id, 'you may place 1 PDS or 1 Space Dock from your reinforcements on this planet');
  const live = showTactical(winnu.table, winnu.move);
  await land('Infantry', 'Target One');
  await land('Mech', 'Target One');
  await land('PDS', 'Target One');
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: { infantry: 1, mech: 1 }, structures: { pds: 1 } }]);
  expectShownWaived('unitsMissing', 'Reclaimer');
});

// Checks: another faction's mech landing with the same PDS shows the warning standing.
// Why the check is NOT redundant here: the ability is printed on the Winnu mech.
test('mech:winnu_mech another faction\'s mech leaves the PDS standing as missing', () => {
  const sol = table('sol', { pds: 1 });
  showTactical(sol.table, sol.move);
  expectShownStanding('unitsMissing');
});
