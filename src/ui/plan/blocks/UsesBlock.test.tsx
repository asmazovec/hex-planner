import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { bench, HOME, NEAR, tactical, using } from '../../../domain/effects/components/kit';
import { expectShownStanding, expectShownWaived, showUses, showWarnings, uiBench, use } from '../../testing/effects';

uiBench();

const HERO = 'leader:letnevhero';
const table = (uses: string[] = []) => {
  const move = using(tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 6 } }] }), ...uses);
  return { move, table: bench({ faction: 'letnev', expansions: ['pok'], units: { [HOME]: { cruiser: 6 } }, start: { leaders: { [HERO]: 'unlocked' } }, entries: [move] }) };
};

test('«+ Used» opens the choice and writes the component into the uses of the entry; what it allows then reads as allowed', async () => {
  const { move, table: letnev } = table();
  const live = showUses(letnev, move);
  expectShownStanding('fleetPool');
  await use('Darktalon Treilla');
  expect(live.entry().uses).toEqual([HERO]);
  expect(within(screen.getByRole('group', { name: 'Used' })).getByTestId(`component-${HERO}`)).toHaveTextContent('used');
  expectShownWaived('fleetPool', 'Darktalon Treilla');
});

test('the cross of a card takes the component back out, and an empty list leaves no key in the entry', async () => {
  const { move, table: letnev } = table([HERO]);
  const live = showUses(letnev, move);
  expectShownWaived('fleetPool', 'Darktalon Treilla');
  await userEvent.click(within(screen.getByTestId(`component-${HERO}`)).getByRole('button', { name: /Remove|Take off|Delete/i }));
  expect('uses' in live.entry() && live.entry().uses !== undefined).toBe(false);
  expectShownStanding('fleetPool');
});

test('a component used is played as a component action plays its own: a hero is purged, so a later entry cannot use it again', () => {
  const first = using(tactical(NEAR, { moves: [] }), HERO);
  const second = using(tactical(HOME, { moves: [] }), HERO);
  const letnev = bench({ faction: 'letnev', expansions: ['pok'], start: { leaders: { [HERO]: 'unlocked' } }, entries: [first, second] });
  showWarnings(letnev, second);
  expectShownStanding('componentNotHeld');
});

test('a waived warning alone has no orange edge, and stands after the warnings that still stand', () => {
  const move = using(tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 6, infantry: 1 } }] }), HERO);
  const letnev = bench({ faction: 'letnev', expansions: ['pok'], units: { [HOME]: { cruiser: 6, infantry: 1 } }, start: { leaders: { [HERO]: 'unlocked' } }, entries: [move] });
  showWarnings(letnev, move);
  const items = [...document.querySelectorAll('.warning-list li')];
  const firstWaived = items.findIndex(item => item.classList.contains('warning-waived'));
  expect(firstWaived).toBeGreaterThan(0);
  expect(items.slice(firstWaived).every(item => item.classList.contains('warning-waived'))).toBe(true);
  expect(document.querySelector('.warning-list')?.classList.contains('place-waived')).toBe(false);
});
