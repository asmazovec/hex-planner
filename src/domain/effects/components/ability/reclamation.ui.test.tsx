import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, land, showTactical, uiBench } from '../../../../ui/testing/effects';
import { MECATOL_PLANET, MECATOL_TILE } from '../../../mecatol';
import type { StructureCounts } from '../../../types';
import { bench, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './reclamation';

uiBench();

const MECATOL = '0,-1';
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', [MECATOL]: MECATOL_TILE };
const table = (faction: string, structures?: StructureCounts) => {
  const move = tactical(MECATOL, {
    moves: [{ from: HOME, units: { carrier: 1, infantry: 1 } }],
    landings: structures ? [{ planetId: MECATOL_PLANET, units: { infantry: 1 }, structures }] : [],
  });
  return { move, table: bench({ faction, units: { [HOME]: { carrier: 1, infantry: 1 } }, entries: [move], game: { map: MAP } }) };
};

// "After you resolve a tactical action during which you gained control of Mecatol Rex: You may place 1 PDS and 1 space
//  dock from your reinforcements on Mecatol Rex."
// Checks: the landing on Mecatol Rex offers a PDS and a space dock although no ship brought one; I land the infantry,
// then put both on Mecatol Rex; they are written into the landing, and the warning that they were not in the space
// area reads as allowed by Reclamation.
// Why the check is redundant here: Reclamation takes the structures from the reinforcements, not from the space area.
test.fails('ability:reclamation the landing offers a PDS and a space dock for Mecatol Rex, and they read as allowed by Reclamation', async () => {
  const winnu = table('winnu');
  quote(winnu.table.pack, id, 'You may place 1 PDS and 1 space dock from your reinforcements on Mecatol Rex');
  const live = showTactical(winnu.table, winnu.move);
  await land('Infantry', 'Mecatol Rex');
  await land('PDS', 'Mecatol Rex');
  await land('Space dock', 'Mecatol Rex');
  expect(live.entry().landings).toEqual([{ planetId: MECATOL_PLANET, units: { infantry: 1 }, structures: { pds: 1, spacedock: 1 } }]);
  expectShownWaived('unitsMissing', 'Reclamation');
});

// LRR 85.2 with the landing: a structure no flight brought is missing from the space area.
// Checks: another faction's landing with the same structures shows the warning standing.
// Why the check is NOT redundant here: the ability is the Winnu's own.
test('ability:reclamation another faction\'s structures on Mecatol Rex stand as missing', () => {
  const sol = table('sol', { pds: 1, spacedock: 1 });
  showTactical(sol.table, sol.move);
  expectShownStanding('unitsMissing');
});
