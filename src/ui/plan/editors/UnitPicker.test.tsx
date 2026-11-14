import { cleanup, render, screen, within } from '@testing-library/react';
import { viewOf } from '../../testing/legacyMap';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { holdingsOf, upgradeTech } from '../../../domain/holdings';
import { createGame } from '../../../domain/newGame';
import { project } from '../../../domain/project';
import type { Game, GameState, UnitCounts, UnitId } from '../../../domain/types';
import { setLanguage } from '../../../i18n';
import type { Move, TacticalEntry } from '../tactical';
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
  const merged = { ...state, holdings: holdingsOf({ technologies: upgrades.map(unit => upgradeTech(pack, 'arborec', unit)!) }), ...before };
  const onChange = vi.fn();
  const onFly = vi.fn();
  const entry: TacticalEntry = {
    id: 'e', phase: 'action', status: 'planned', type: 'tactical', systemId: '0,0', moves, landings: [], production, payment: { planets: [], tradeGoods: 0 },
  };
  function Live() {
    const [list, setList] = useState(moves);
    return (
      <UnitPicker view={viewOf(game, merged, pack)}
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
  expect(screen.getByText('Flight Nestphar → Mecatol Rex')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Flying' })).toBeVisible();
  expect(screen.getByText('Cargo on board: 0 of 0')).toBeVisible();
  expect([...document.querySelectorAll('.stop-name')].map(el => el.textContent)).toEqual(['Nestphar · start', 'Quann · on the way', 'Mecatol Rex · target']);
});

test('nothing is chosen on opening, and Fly waits for a choice', () => {
  const { onChange, onFly } = setup([{ from: SOURCE, units: {} }]);
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /^Return one / })).toBeNull();
  expect(screen.getByRole('button', { name: 'Fly' })).toBeDisabled();
  expect(onFly).not.toHaveBeenCalled();
});

test('a tap on a picture moves one ship, a tap on a chosen one returns it', async () => {
  const { onChange, onFly } = setup([{ from: SOURCE, units: {} }]);
  await userEvent.click(take('Carrier'));
  expect(onChange).toHaveBeenLastCalledWith([{ from: SOURCE, units: { carrier: 1 } }]);
  expect(put('Carrier')).toBeVisible();
  // The last one taken, the button stays in its place and only changes its look: another one there would come under the finger.
  expect(take('Carrier')).toHaveClass('draft-take-over');
  expect(take('Carrier')).toBeEnabled();
  expect(screen.getByText('Cargo on board: 0 of 4')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Fly' }));
  expect(onFly).toHaveBeenCalled();
  await userEvent.click(put('Carrier'));
  // The source's own move stays, empty, for its arrow.
  expect(onChange).toHaveBeenLastCalledWith([{ from: SOURCE, units: {} }]);
  expect(take('Carrier')).not.toHaveClass('draft-take-over');
});

test('fighters with no move value and ground units are cargo, listed at their system, never as flying', async () => {
  const { onChange } = setup([{ from: SOURCE, units: { carrier: 1 } }]);
  const start = lineOf(/· start/);
  expect(start.getByRole('button', { name: 'Take one Fighter' })).toBeVisible();
  await userEvent.click(start.getByRole('button', { name: 'Take one Fighter' }));
  expect(onChange).toHaveBeenLastCalledWith([{ from: SOURCE, units: { carrier: 1, fighter: 1 } }]);
  expect(screen.getByText('Cargo on board: 1 of 4')).toBeVisible();
  // What is left stays a button, what was taken is a chip in the tray of the same row.
  expect(start.getByRole('button', { name: 'Return one Fighter' })).toHaveClass('draft-chip');
  expect(start.getByRole('button', { name: 'Return one Fighter' })).toHaveTextContent('×1');
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

test('the row of places on board and the line under it are there from the start, with no places too', async () => {
  setup([{ from: SOURCE, units: {} }]);
  expect(document.querySelectorAll('.pips')).toHaveLength(1);
  expect(document.querySelectorAll('.pip')).toHaveLength(0);
  expect(document.querySelector('.cargo-note')).toHaveTextContent('No room for cargo');
  await userEvent.click(take('Carrier'));
  expect(document.querySelectorAll('.pip')).toHaveLength(4);
  // The line stays, empty: the stops under it do not move.
  expect(document.querySelector('.cargo-note')).toBeEmptyDOMElement();
});

test('more places on board than the row holds end in a number, so the row never wraps', () => {
  setup([{ from: SOURCE, units: { carrier: 5 } }], { systems: { [SOURCE]: { carrier: 5 } } });
  expect(screen.getByText('Cargo on board: 0 of 20')).toBeVisible();
  expect(document.querySelectorAll('.pip')).toHaveLength(15);
  expect(document.querySelector('.pips-more')).toHaveTextContent('+5');
});

test('a unit taken or returned adds and removes no control: every kind keeps its button and its place in the tray', async () => {
  const { onChange } = setup([{ from: SOURCE, units: {} }], { systems: { [SOURCE]: { carrier: 1, cruiser: 2 } } });
  const row = () => within(screen.getByRole('group', { name: 'Space' }));
  const places = () => [row().getAllByRole('button', { name: /^Take one / }).length, document.querySelectorAll('.unit-picker .draft-tray > *').length];
  const before = places();
  await userEvent.click(take('Cruiser'));
  await userEvent.click(take('Cruiser'));
  expect(take('Cruiser')).toHaveClass('draft-take-over');
  expect(take('Cruiser')).toHaveAttribute('title', 'Take one Cruiser: none left, the next one is taken beyond the stock');
  expect(places()).toEqual(before);
  // Nothing forbids one more than stands there: it flies in the plan, the button counts it, and the domain warns.
  await userEvent.click(take('Cruiser'));
  expect(onChange).toHaveBeenLastCalledWith([{ from: SOURCE, units: { cruiser: 3 } }]);
  expect(take('Cruiser').querySelector('.draft-over')).toHaveTextContent('+1');
  expect(places()).toEqual(before);
  await userEvent.click(put('Cruiser'));
  await userEvent.click(put('Cruiser'));
  await userEvent.click(put('Cruiser'));
  expect(places()).toEqual(before);
});

test('a source with no ships offers no ship or cargo it does not have (#1)', () => {
  setup([{ from: SOURCE, units: {} }], { systems: {}, ground: {} });
  expect(screen.getByText('No ships here.')).toBeVisible();
  for (const unit of ['Carrier', 'Cruiser', 'Destroyer', 'Dreadnought', 'War Sun', 'Flagship', 'Fighter', 'Mech', 'Infantry']) {
    expect(screen.queryByRole('button', { name: `Take one ${unit}` })).toBeNull();
  }
  expect(screen.getByRole('button', { name: 'Fly' })).toBeDisabled();
});

test('a system with my command token on the way still offers its units, and says the rules warn (#2)', async () => {
  const { onChange } = setup([{ from: SOURCE, units: { carrier: 1 }, via: [TRANSIT] }], {
    systems: { [SOURCE]: { carrier: 1 }, [TRANSIT]: { fighter: 2 } }, ground: {}, tokensOnMap: [TRANSIT],
  });
  const transit = lineOf(/on the way/);
  expect(transit.getByText(/Your command token is here/)).toBeVisible();
  await userEvent.click(transit.getByRole('button', { name: 'Take one Fighter' }));
  expect(onChange).toHaveBeenLastCalledWith([
    { from: SOURCE, units: { carrier: 1 }, via: [TRANSIT] },
    { from: TRANSIT, units: { fighter: 1 }, pickupOf: SOURCE },
  ]);
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
  expect(screen.getByText('Перелёт Nestphar → Mecatol Rex')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Вернуть: Транспортник' })).toBeVisible();
  const planet = screen.getByRole('group', { name: 'Nestphar' });
  expect(within(planet).getByRole('button', { name: 'Взять: Пехота' })).toBeVisible();
});

test.each(['en', 'ru'] as const)('every unit id has a %s name, and both structures, which a flight may take on board', async lang => {
  const dict = (await import(`../../../i18n/${lang}.json`)).default as { unit: Record<string, string> };
  expect(Object.keys(dict.unit).sort()).toEqual(
    ['carrier', 'cruiser', 'destroyer', 'dreadnought', 'fighter', 'flagship', 'infantry', 'mech', 'pds', 'spacedock', 'warsun'],
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
