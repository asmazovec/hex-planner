import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../domain/newGame';
import { project, suggestUnits } from '../../domain/project';
import type { Game, GameState, UnitCounts } from '../../domain/types';
import { setLanguage } from '../../i18n';
import type { TacticalEntry } from './tactical';
import { UnitPicker } from './UnitPicker';

const pack = loadPack(['pok']);

afterEach(cleanup);
beforeEach(() => setLanguage('en'));

test('suggestUnits предлагает корабли и груз в пределах вместимости', () => {
  expect(suggestUnits({ carrier: 1, fighter: 3, infantry: 3 }, pack)).toEqual({ carrier: 1, fighter: 3, infantry: 1 });
});

test('suggestUnits takes no cargo without capacity, and does not count cargo as ships', () => {
  expect(suggestUnits({ destroyer: 2, fighter: 3, infantry: 1 }, pack)).toEqual({ destroyer: 2 });
  expect(suggestUnits({}, pack)).toEqual({});
});

function setup(moves: { from: string; units: UnitCounts }[], before: Partial<GameState> = {}, production: UnitCounts = {}) {
  const game: Game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  game.map['1,0'] = '5';
  const state = project(game, game.plans[0], 'forecast', pack).state;
  const merged = { ...state, ...before };
  const onChange = vi.fn();
  const entry: TacticalEntry = {
    id: 'e', phase: 'action', status: 'planned', type: 'tactical', systemId: '0,0', moves, landings: [], production, payment: { planets: [], tradeGoods: 0 },
  };
  render(
    <UnitPicker
      game={game} pack={pack} before={merged} entry={entry} source="1,0"
      onChange={onChange} onClose={() => undefined}
    />,
  );
  return onChange;
}

test('shows what the source holds, and capacity and fleet meters for the picked group', () => {
  setup([{ from: '1,0', units: { carrier: 1, cruiser: 1, fighter: 2, infantry: 2 } }]);
  expect(screen.getByRole('group', { name: 'Carrier' })).toHaveTextContent('1/1');
  expect(screen.getByRole('group', { name: 'Infantry' })).toHaveTextContent('2/4');
  expect(screen.getByText('Capacity: 4 of 4')).toBeVisible();
  expect(screen.getByText('Fleet pool: 2 of 3')).toBeVisible();
});

test('a stepper rewrites the move; a move with no units left is dropped', async () => {
  const onChange = setup([{ from: '1,0', units: { carrier: 1 } }]);
  const row = screen.getByRole('group', { name: 'Carrier' });
  await userEvent.click(within(row).getByRole('button', { name: 'Remove one Carrier' }));
  expect(onChange).toHaveBeenLastCalledWith([]);
  const infantry = screen.getByRole('group', { name: 'Infantry' });
  await userEvent.click(within(infantry).getByRole('button', { name: 'Add one Infantry' }));
  expect(onChange).toHaveBeenLastCalledWith([{ from: '1,0', units: { carrier: 1, infantry: 1 } }]);
});

test('going over what is available stays possible, warnings do not forbid', () => {
  setup([{ from: '1,0', units: { carrier: 1 } }]);
  const row = screen.getByRole('group', { name: 'Carrier' });
  expect(within(row).getByRole('button', { name: 'Add one Carrier' })).toBeEnabled();
});

test('ground units can be picked up from a planet of the source', async () => {
  const onChange = setup([], { ground: { nestphar: { infantry: 2 } } });
  const planet = screen.getByRole('group', { name: 'Nestphar' });
  await userEvent.click(within(planet).getByRole('button', { name: 'Add one Infantry' }));
  expect(onChange).toHaveBeenLastCalledWith([{ from: 'nestphar', units: { infantry: 1 } }]);
});

test('unit names follow the interface language, planet names stay English', () => {
  setLanguage('ru');
  setup([{ from: '1,0', units: { carrier: 1 } }], { ground: { nestphar: { infantry: 2 } } });
  expect(screen.getByRole('group', { name: 'Транспортник' })).toBeVisible();
  expect(screen.getByRole('group', { name: 'Истребитель' })).toBeVisible();
  const planet = screen.getByRole('group', { name: 'Nestphar' });
  expect(within(planet).getByRole('group', { name: 'Пехота' })).toBeVisible();
});

test.each(['en', 'ru'] as const)('every unit id has a %s name', async lang => {
  const dict = (await import(`../../i18n/${lang}.json`)).default as { unit: Record<string, string> };
  expect(Object.keys(dict.unit).sort()).toEqual(
    ['carrier', 'cruiser', 'destroyer', 'dreadnought', 'fighter', 'flagship', 'infantry', 'mech', 'warsun'],
  );
  expect(Object.values(dict.unit).every(name => name.length > 0)).toBe(true);
});

test('a pickup from a planet counts in the capacity meter, production in the fleet meter', () => {
  setup(
    [{ from: '1,0', units: { cruiser: 1 } }, { from: 'nestphar', units: { infantry: 1 } }],
    { ground: { nestphar: { infantry: 2 } } }, { cruiser: 3 },
  );
  expect(screen.getByText('Capacity: 1 of 0')).toBeVisible();
  expect(screen.getByText('Fleet pool: 4 of 3')).toBeVisible();
});
