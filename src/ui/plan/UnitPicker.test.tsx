import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../domain/newGame';
import { project } from '../../domain/project';
import type { Game, GameState, UnitCounts, UnitId } from '../../domain/types';
import { setLanguage } from '../../i18n';
import type { Move, TacticalEntry } from './tactical';
import { UnitPicker } from './UnitPicker';

const pack = loadPack(['pok']);

afterEach(cleanup);
beforeEach(() => setLanguage('en'));

const SOURCE = '1,0';
const TRANSIT = '1,1';

function setup(moves: Move[], before: Partial<GameState> = {}, production: UnitCounts = {}, upgrades: UnitId[] = []) {
  const game: Game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  delete game.map['0,-3'];
  game.map[SOURCE] = '5';
  game.map[TRANSIT] = '25';
  const state = project(game, game.plans[0], 'forecast', pack).state;
  const merged = { ...state, upgrades, ...before };
  const onChange = vi.fn();
  const onFly = vi.fn();
  const entry: TacticalEntry = {
    id: 'e', phase: 'action', status: 'planned', type: 'tactical', systemId: '0,0', moves, landings: [], production, payment: { planets: [], tradeGoods: 0 },
  };
  function Live() {
    const [list, setList] = useState(moves);
    return (
      <UnitPicker
        game={game} pack={pack} before={merged} entry={{ ...entry, moves: list }} source={SOURCE}
        onChange={next => { onChange(next); setList(next); }} onClose={() => undefined} onFly={onFly}
      />
    );
  }
  render(<Live />);
  return { onChange, onFly };
}

const take = (unit: string) => screen.getByRole('button', { name: `Take one ${unit}` });
const put = (unit: string) => screen.getByRole('button', { name: `Return one ${unit}` });
const lineOf = (text: RegExp) => within(screen.getByText(text).closest('li')!);

test('the title, the sections and the timeline in flight order', () => {
  setup([{ from: SOURCE, units: {}, via: [TRANSIT] }]);
  expect(screen.getByText('Flight 5 → 18')).toBeVisible();
  expect(screen.getByText('In system 5')).toBeVisible();
  expect(screen.getByText('Flying')).toBeVisible();
  expect(screen.getByText('Cargo on board: 0 of 0')).toBeVisible();
  expect([...document.querySelectorAll('.stop-name')].map(el => el.textContent)).toEqual(['5 · start', '25 · on the way', '18 · target']);
});

test('nothing is chosen on opening, and Fly waits for a choice', () => {
  const { onChange, onFly } = setup([{ from: SOURCE, units: {} }]);
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByText('Nobody yet')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Fly' })).toBeDisabled();
  expect(onFly).not.toHaveBeenCalled();
});

test('a tap on a picture moves one ship, a tap on a chosen one returns it', async () => {
  const { onChange, onFly } = setup([{ from: SOURCE, units: {} }]);
  await userEvent.click(take('Carrier'));
  expect(onChange).toHaveBeenLastCalledWith([{ from: SOURCE, units: { carrier: 1 } }]);
  expect(put('Carrier')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Take one Carrier' })).toBeNull();
  expect(screen.getByText('Cargo on board: 0 of 4')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Fly' }));
  expect(onFly).toHaveBeenCalled();
  await userEvent.click(put('Carrier'));
  // The source's own move stays, empty, for its arrow.
  expect(onChange).toHaveBeenLastCalledWith([{ from: SOURCE, units: {} }]);
  expect(take('Carrier')).toBeVisible();
});

test('fighters with no move value and ground units are cargo, listed at their system, never as flying', async () => {
  const { onChange } = setup([{ from: SOURCE, units: { carrier: 1 } }]);
  const start = lineOf(/· start/);
  expect(start.getByRole('button', { name: 'Take one Fighter' })).toBeVisible();
  await userEvent.click(start.getByRole('button', { name: 'Take one Fighter' }));
  expect(onChange).toHaveBeenLastCalledWith([{ from: SOURCE, units: { carrier: 1, fighter: 1 } }]);
  expect(screen.getByText('Cargo on board: 1 of 4')).toBeVisible();
  // Taken and available stand side by side.
  expect(start.getByRole('button', { name: 'Return one Fighter' })).toHaveClass('pic-taken');
  expect(start.getByRole('button', { name: 'Take one Fighter' })).toBeVisible();
});

test('fighters whose current stat has a move value are ships and take no cargo place', async () => {
  setup([{ from: SOURCE, units: { carrier: 1 } }], {}, {}, ['fighter']);
  const start = lineOf(/· start/);
  expect(start.queryByRole('button', { name: 'Take one Fighter' })).toBeNull();
  await userEvent.click(take('Fighter'));
  expect(put('Fighter')).toBeVisible();
  expect(screen.getByText('Cargo on board: 0 of 4')).toBeVisible();
});

test('cargo on the way is taken per system and per planet, as a pickup of this group', async () => {
  const { onChange } = setup([{ from: SOURCE, units: { carrier: 1 }, via: [TRANSIT] }], {
    systems: { [SOURCE]: { carrier: 1 }, [TRANSIT]: { fighter: 2 } }, ground: { quann: { infantry: 2 } },
  });
  const transit = lineOf(/on the way/);
  await userEvent.click(within(transit.getByRole('group', { name: '25' })).getByRole('button', { name: 'Take one Fighter' }));
  expect(onChange).toHaveBeenLastCalledWith([
    { from: SOURCE, units: { carrier: 1 }, via: [TRANSIT] },
    { from: TRANSIT, units: { fighter: 1 }, pickupOf: SOURCE },
  ]);
  await userEvent.click(within(transit.getByRole('group', { name: 'Quann' })).getByRole('button', { name: 'Take one Infantry' }));
  expect(onChange.mock.lastCall?.[0]).toContainEqual({ from: 'quann', units: { infantry: 1 }, pickupOf: SOURCE });
  expect(screen.getByText('Cargo on board: 2 of 4')).toBeVisible();
  await userEvent.click(transit.getByRole('button', { name: 'Return one Fighter' }));
  expect(onChange.mock.lastCall?.[0].some((m: Move) => m.from === TRANSIT)).toBe(false);
});

test('a system with no cargo says so', () => {
  setup([{ from: SOURCE, units: {}, via: [TRANSIT] }]);
  expect(lineOf(/on the way/).getByText('Nothing to take')).toBeVisible();
});

test('a pip per place: filled for load, red past capacity, and the warning blocks nothing', () => {
  setup([{ from: SOURCE, units: { cruiser: 1, infantry: 1, fighter: 1 } }]);
  const pips = [...document.querySelectorAll('.pip')];
  expect(pips).toHaveLength(2);
  expect(pips.filter(p => p.classList.contains('pip-full') && p.classList.contains('pip-over'))).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Fly' })).toBeEnabled();
});

test('a source with no ships offers all ship types and ground units, and choosing warns nothing here', async () => {
  const { onChange } = setup([{ from: SOURCE, units: {} }], { systems: {}, ground: {} });
  expect(screen.getByText(/No ships here/)).toBeVisible();
  for (const unit of ['Carrier', 'Cruiser', 'Destroyer', 'Dreadnought', 'War Sun', 'Flagship']) expect(take(unit)).toBeVisible();
  await userEvent.click(take('Destroyer'));
  await userEvent.click(take('Destroyer'));
  expect(onChange).toHaveBeenLastCalledWith([{ from: SOURCE, units: { destroyer: 2 } }]);
  const start = lineOf(/· start/);
  expect(start.getByRole('button', { name: 'Take one Fighter' })).toBeVisible();
  await userEvent.click(start.getByRole('button', { name: 'Take one Mech' }));
  expect(onChange.mock.lastCall?.[0]).toContainEqual({ from: 'nestphar', units: { mech: 1 } });
});

test('what another route of the action takes is not offered twice', () => {
  const moves: Move[] = [{ from: SOURCE, units: {}, via: [TRANSIT] }, { from: TRANSIT, units: { fighter: 1 }, pickupOf: 'other' }];
  setup(moves, { systems: { [SOURCE]: { carrier: 1 }, [TRANSIT]: { fighter: 1 } }, ground: {} });
  expect(lineOf(/on the way/).getByText('Nothing to take')).toBeVisible();
});

test('removing the route takes the source and all it picked up, leaving other sources', async () => {
  const moves: Move[] = [
    { from: SOURCE, units: { carrier: 1 }, via: [TRANSIT] }, { from: TRANSIT, units: { fighter: 1 }, pickupOf: SOURCE }, { from: 'nestphar', units: { infantry: 1 } },
    { from: '0,1', units: { cruiser: 1 } },
  ];
  const { onChange } = setup(moves, { ground: { nestphar: { infantry: 1 } } });
  await userEvent.click(screen.getByRole('button', { name: 'Remove route' }));
  expect(onChange).toHaveBeenLastCalledWith([{ from: '0,1', units: { cruiser: 1 } }]);
});

test('unit names follow the interface language, planet names stay English', () => {
  setLanguage('ru');
  setup([{ from: SOURCE, units: { carrier: 1 } }], { ground: { nestphar: { infantry: 2 } } });
  expect(screen.getByText('Перелёт 5 → 18')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Вернуть: Транспортник' })).toBeVisible();
  const planet = screen.getByRole('group', { name: 'Nestphar' });
  expect(within(planet).getByRole('button', { name: 'Взять: Пехота' })).toBeVisible();
});

test.each(['en', 'ru'] as const)('every unit id has a %s name', async lang => {
  const dict = (await import(`../../i18n/${lang}.json`)).default as { unit: Record<string, string> };
  expect(Object.keys(dict.unit).sort()).toEqual(
    ['carrier', 'cruiser', 'destroyer', 'dreadnought', 'fighter', 'flagship', 'infantry', 'mech', 'warsun'],
  );
  expect(Object.values(dict.unit).every(name => name.length > 0)).toBe(true);
});

test('a pickup from a planet counts in the cargo, production in the fleet line', () => {
  setup(
    [{ from: SOURCE, units: { cruiser: 1 } }, { from: 'nestphar', units: { infantry: 1 } }],
    { ground: { nestphar: { infantry: 2 } } }, { cruiser: 3 },
  );
  expect(screen.getByText('Cargo on board: 1 of 0')).toBeVisible();
  // Over the limit the line gives way to the warning, in the look of every warning.
  expect(screen.queryByText('Fleet pool: 4 of 3')).toBeNull();
});

test('within the limit the fleet line stands as a quiet note', () => {
  setup([{ from: SOURCE, units: { cruiser: 1 } }], {}, { cruiser: 1 });
  expect(screen.getByText('Fleet pool: 2 of 3')).toHaveClass('muted');
});
