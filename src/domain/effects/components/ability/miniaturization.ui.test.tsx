import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, land, showFlight, showTactical, take, uiBench } from '../../../../ui/testing/effects';
import structureAboard from '../../../rules/codes/structureAboard';
import type { Game } from '../../../../testing/old/domain/types';
import { bench, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './miniaturization';

uiBench();

const CODE = structureAboard.code;
const table = (faction: string, move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] }), game: Partial<Game> = { pds: { h1: 1 }, docks: ['h1'] }) =>
  ({ move, table: bench({ faction, expansions: ['te'], units: { [HOME]: { cruiser: 1, infantry: 1 } }, entries: [move], game }) });

// "Your structures can be transported by any ship; this does not require or count against capacity."
// Checks: the cargo of a flight offers the PDS and the space dock of the source's planet; I take the PDS aboard a
// cruiser, it is written into the move, and the warning that structures are not transported reads as allowed by
// Miniaturization.
// Why the check is redundant here: LRR 85.3 forbids transporting a structure, and the ability allows it to the Ral Nel.
test('ability:miniaturization a structure of the source planet is taken aboard, and the warning reads as allowed by Miniaturization', async () => {
  const ralnel = table('ralnel');
  quote(ralnel.table.pack, id, 'Your structures can be transported by any ship');
  const live = showFlight(ralnel.table, ralnel.move, HOME);
  await take('Cruiser');
  expect(screen.getByRole('button', { name: 'Take one Space dock' })).toBeEnabled();
  await take('PDS', 'Home One');
  expect(live.entry().moves).toContainEqual({ from: 'h1', units: {}, structures: { pds: 1 } });
  expectShownWaived(CODE, 'Miniaturization');
});

// LRR 85.3: "Structures cannot move or be transported."
// Checks: the structure is offered to every faction, since a warning forbids nothing; for another one it stands.
// Why the check is NOT redundant here: nothing this player holds speaks of transporting structures.
test('ability:miniaturization another faction can take the structure aboard too, and its warning stands', async () => {
  const sol = table('sol');
  const live = showFlight(sol.table, sol.move, HOME);
  await take('Cruiser');
  await take('PDS', 'Home One');
  expect(live.entry().moves).toContainEqual({ from: 'h1', units: {}, structures: { pds: 1 } });
  expectShownStanding(CODE);
});

// Checks: a source without structures offers none, so the cargo rows stay as light as they were.
test('ability:miniaturization a source without structures offers none', () => {
  const bare = table('ralnel', undefined, {});
  showFlight(bare.table, bare.move, HOME);
  expect(screen.queryByRole('button', { name: 'Take one PDS' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Take one Space dock' })).toBeNull();
});

// "At the end of your tactical actions: you may place your structures that are in space areas onto planets you
//  control in their respective systems."
// Checks: in the tactical editor the landing offers the PDS that arrived; I land the infantry and put the PDS on the
// same planet, and both are written into the landing.
// Why the check is redundant here: the ability names its own moment to place a structure, apart from Construction (85.2).
test('ability:miniaturization the structure that arrived is put on a planet in the landing of the action', async () => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1, infantry: 1 }, via: [NEAR] }, { from: 'h1', units: {}, structures: { pds: 1 } }] });
  const ralnel = table('ralnel', move);
  const live = showTactical(ralnel.table, move);
  await land('Infantry', 'Target One');
  await land('PDS', 'Target One');
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: { infantry: 1 }, structures: { pds: 1 } }]);
  expectShownWaived(CODE, 'Miniaturization');
});
