import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, land, showTactical, uiBench } from '../../../../ui/testing/effects';
import { MECATOL_PLANET, MECATOL_TILE } from '../../../mecatol';
import { bench, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './blood_ties';

uiBench();

const MECATOL = '0,-1';
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', [MECATOL]: MECATOL_TILE };
const table = (faction: string) => {
  const move = tactical(MECATOL, { moves: [{ from: HOME, units: { carrier: 1, infantry: 1 } }] });
  return { move, table: bench({ faction, units: { [HOME]: { carrier: 1, infantry: 1 } }, entries: [move], game: { map: MAP } }) };
};

// "You do not have to spend influence to remove the custodians token from Mecatol Rex."
// Checks: in the landing of the tactical editor I land the infantry on Mecatol Rex; it is written into the entry, and
// the warning of the custodians token reads as allowed by Blood Ties.
// Why the check is redundant here: 54.1 asks six influence, which the Winnu do not spend.
test('ability:blood_ties the infantry lands on Mecatol Rex, and the custodians token reads as allowed by Blood Ties', async () => {
  const winnu = table('winnu');
  quote(winnu.table.pack, id, 'You do not have to spend influence to remove the custodians token');
  const live = showTactical(winnu.table, winnu.move);
  await land('Infantry', 'Mecatol Rex');
  expect(live.entry().landings).toEqual([{ planetId: MECATOL_PLANET, units: { infantry: 1 } }]);
  expectShownWaived('custodians', 'Blood Ties');
});

// LRR 54.1: six influence remove the custodians token.
// Checks: another faction lands the same way, and the warning stands.
// Why the check is NOT redundant here: the ability is the Winnu's own.
test('ability:blood_ties another faction lands the same way, and the custodians token stands', async () => {
  const sol = table('sol');
  showTactical(sol.table, sol.move);
  await land('Infantry', 'Mecatol Rex');
  expectShownStanding('custodians');
});
