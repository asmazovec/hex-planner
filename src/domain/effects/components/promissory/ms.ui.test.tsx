import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { expectShownStanding, showFlight, showWarnings, take, takeButton, uiBench } from '../../../../ui/testing/effects';
import type { Entry, ExtensionCode, Opponent } from '../../../types';
import { bench, componentAction, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './ms';

uiBench();

const SOL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;
const play = (planet: string) => componentAction(NOTE, { choices: { planet } } as Partial<Entry>);
const flight = (before: Entry[]) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const table = bench({ faction: 'letnev', units: { [HOME]: { carrier: 1 } }, start: { promissory: [NOTE] }, entries: [...before, move], game: { opponents: [SOL] } });
  return { table, live: showFlight(table, move, HOME) };
};

// "Then, you may place 2 infantry from your reinforcements on any planet you control."
// Checks: after Military Support on Home One, the flight out of the home system offers its two infantry in the plain
// look; I take both aboard the carrier and nothing is missing.
// Why the check is redundant here: the note placed them, so they stand on the planet the flight takes them from.
test('promissory:ms the two infantry placed are offered on the planet and taken aboard', async () => {
  const { table, live } = flight([play('h1')]);
  quote(table.pack, id, 'you may place 2 infantry from your reinforcements on any planet you control');
  expect(takeButton('Infantry', 'Home One').className).not.toContain('draft-take-over');
  await take('Carrier');
  await take('Infantry', 'Home One');
  await take('Infantry', 'Home One');
  expect(live.warnings().filter(w => w.code === 'unitsMissing')).toEqual([]);
});

// Checks: without the note played, Home One has nothing to take.
// Why the check is NOT redundant here: no infantry were placed.
test('promissory:ms not played, the planet has no infantry to take', () => {
  flight([]);
  expect(screen.queryByRole('group', { name: 'Home One' })).toBeNull();
});

// "... on any planet you control."
// Checks: the note played on Target One shows the warning of a planet I do not control, standing.
// Why the check is NOT redundant here: the card places on a planet the holder controls only.
test('promissory:ms on a planet I do not control shows the warning standing', () => {
  const entry = play('t1');
  showWarnings(bench({ faction: 'letnev', start: { promissory: [NOTE] }, entries: [entry], game: { opponents: [SOL] } }), entry);
  expectShownStanding('placeNotControlled' as ExtensionCode);
});
