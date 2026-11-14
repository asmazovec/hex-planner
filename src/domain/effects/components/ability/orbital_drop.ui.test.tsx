import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { showFlight, showWarnings, take, takeButton, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, componentAction, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './orbital_drop';

uiBench();

const drop = () => componentAction(id, { choices: { planet: 'h1' } } as Partial<Entry>);
const flight = (faction: string) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const table = bench({ faction, units: { [HOME]: { carrier: 1 } }, entries: [drop(), move] });
  return { table, live: showFlight(table, move, HOME) };
};

// "ACTION: Spend 1 token from your strategy pool to place 2 infantry from your reinforcements on 1 planet you control."
// Checks: after Orbital Drop on Home One, the flight out of the home system offers the two infantry of Home One in the
// plain look (not the dashed «beyond the stock»); I take both aboard the carrier and nothing is missing.
// Why the check is redundant here: the infantry were placed by the ability, so they stand on the planet and the
// flight takes units that are there.
test('ability:orbital_drop the two infantry dropped are offered on the planet and taken aboard', async () => {
  const { table, live } = flight('sol');
  quote(table.pack, id, 'place 2 infantry from your reinforcements on 1 planet you control');
  expect(takeButton('Infantry', 'Home One').className).not.toContain('draft-take-over');
  await take('Carrier');
  await take('Infantry', 'Home One');
  await take('Infantry', 'Home One');
  expect(live.entry().moves).toContainEqual({ from: 'h1', units: { infantry: 2 } });
  expect(live.warnings().filter(w => w.code === 'unitsMissing')).toEqual([]);
});

// Checks: another faction's flight finds nothing on Home One, so the planet has no row to take from.
// Why the check is NOT redundant here: nothing placed infantry for this faction.
test('ability:orbital_drop another faction finds no infantry dropped on the planet', () => {
  flight('letnev');
  expect(screen.queryByRole('group', { name: 'Home One' })).toBeNull();
});

// LRR 20.4 with "Spend 1 token from your strategy pool".
// Checks: the warnings of the drop with an empty strategy pool show the pool going below zero, standing.
// Why the check is NOT redundant here: the ability has a cost the pool cannot pay.
test('ability:orbital_drop with an empty strategy pool shows the pool going below zero', () => {
  const entry = drop();
  const table = bench({ faction: 'sol', entries: [adjust({ strategy: -2 }), entry] });
  showWarnings(table, entry);
  expect(document.querySelectorAll('li[data-code="poolNegative"]').length).toBeGreaterThan(0);
});
