import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as edits from '../../testing/entries';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { gameNow } from '../../testing/store';
import { PlanScreen } from './PlanScreen';

/**
 * The map while a tactical action chooses on it: the options that lead to a warning (the kernel says which) are dashed
 * and say why, the clean ones look as before, and every one of them still takes the tap and gets its warning.
 */
const pack = loadPack(['pok'], 'en');
/** The Arborec home with its starting fleet, the target next to it, a way between them and an asteroid field beside the home. */
const HOME = '1,0';
const TARGET = '0,1';
const WAY = '1,1';
const ROCKS = '2,-1';
const NO_PAY = { planets: [], tradeGoods: 0 };

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  useGame.getState().setTile('0,-3', null);
  useGame.getState().setTile(HOME, pack.factions.arborec.homeTile);
  useGame.getState().setTile(TARGET, '25');
  useGame.getState().setTile(WAY, '39');
  useGame.getState().setTile(ROCKS, '44');
});

const tile = (slot: string) => document.querySelector(`[data-slot="${slot}"]`)!;
const note = (slot: string) => tile(slot).querySelector('title')?.textContent ?? '';
const tactical = (systemId: string) => edits.addEntry(1, { type: 'tactical', systemId, moves: [], landings: [], production: {}, payment: NO_PAY }, 'action');
const warningsShown = () => [...document.querySelectorAll('.warning-list li')].map(li => li.getAttribute('data-code'));

async function newTactical() {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
}

test('the active system of a new action: a system under the player\'s token is dashed and says why, the others are plain; it still takes the tap and warns', async () => {
  tactical(TARGET);
  await newTactical();
  expect(tile(TARGET)).toHaveClass('tile-warned');
  expect(note(TARGET)).toMatch(/already holds .* token/);
  expect(tile(WAY)).not.toHaveClass('tile-warned');
  expect(tile(WAY)).not.toHaveClass('tile-valid');
  expect(note(WAY)).toBe('');
  await userEvent.click(tile(TARGET));
  expect(gameNow()!.plans[0].rounds[0].entries.filter(e => e.type === 'tactical')).toHaveLength(2);
  expect(warningsShown()).toContain('systemHasToken');
});

test('the source of a route: a system under the player\'s token is dashed, a clean one is lit', async () => {
  // The first action stands on the home system: its ships cannot leave it this round (58.3.3).
  tactical(HOME);
  edits.addEntry(1, { type: 'adjustment', label: 'ships', delta: { units: { systemId: WAY, units: { cruiser: 1 } } } }, 'strategy');
  await newTactical();
  await userEvent.click(tile(TARGET));
  await userEvent.click(screen.getByRole('button', { name: 'Add source' }));
  expect(tile(HOME)).toHaveClass('tile-warned');
  expect(note(HOME)).not.toBe('');
  expect(tile(WAY)).toHaveClass('tile-valid');
  // The dashed one is chosen all the same, and the action gets the warning.
  await userEvent.click(tile(HOME));
  await userEvent.click(tile(TARGET));
  expect(warningsShown()).toContain('sourceActivated');
});

test('a route under way: an asteroid field beside it is dashed, where the ships can go is lit', async () => {
  await newTactical();
  await userEvent.click(tile(TARGET));
  await userEvent.click(screen.getByRole('button', { name: 'Add source' }));
  await userEvent.click(tile(HOME));
  expect(tile(ROCKS)).toHaveClass('tile-warned');
  expect(note(ROCKS)).not.toBe('');
  expect(tile(WAY)).toHaveClass('tile-valid');
  await userEvent.click(tile(ROCKS));
  await userEvent.click(tile(TARGET));
  expect(warningsShown()).toContain('routeBlocked');
});

const button = (name: string | RegExp, within_?: HTMLElement) => (within_ ? within(within_) : screen).getByRole('button', { name });
const tap = (name: string | RegExp, within_?: HTMLElement) => userEvent.click(button(name, within_));
const DASHED = 'draft-take-over';

test('the units of a flight: cargo with no ship to carry it is dashed and says why, plain once a carrier flies; one over the capacity is dashed again, still taken and warned of', async () => {
  await newTactical();
  await userEvent.click(tile(TARGET));
  await userEvent.click(screen.getByRole('button', { name: 'Add source' }));
  await userEvent.click(tile(HOME));
  await userEvent.click(tile(TARGET));
  // The stock holds two fighters, so it is not the stock that marks the button.
  expect(button('Take one Fighter')).toHaveClass(DASHED);
  expect(button('Take one Fighter').title).toMatch(/capacity/i);
  expect(button('Take one Carrier')).not.toHaveClass(DASHED);
  await tap('Take one Carrier');
  expect(button('Take one Fighter')).not.toHaveClass(DASHED);
  expect(button('Take one Infantry')).not.toHaveClass(DASHED);
  await tap('Take one Fighter');
  await tap('Take one Fighter');
  await tap('Take one Infantry');
  await tap('Take one Infantry');
  // Four places on board are taken: the fifth is over, though two infantry still stand on the planet.
  expect(button('Take one Infantry')).toHaveClass(DASHED);
  expect(button('Take one Infantry')).toBeEnabled();
  expect(warningsShown()).not.toContain('capacityGroup');
  await tap('Take one Infantry');
  expect(warningsShown()).toContain('capacityGroup');
  // Taken beyond the capacity it stays marked: it is what holds the warning.
  expect(button('Take one Infantry')).toHaveClass(DASHED);
});

test('the landing: a ground force beyond what arrived is dashed with the reason, one that arrived is plain', async () => {
  const id = edits.addEntry(1, { type: 'tactical', systemId: TARGET, moves: [{ from: HOME, units: { carrier: 1 } }, { from: 'nestphar', units: { infantry: 1 } }], landings: [], production: {}, payment: NO_PAY }, 'action');
  render(<PlanScreen />);
  await tap(/^Edit: Tactical action/);
  expect(button('Land one Infantry')).not.toHaveClass(DASHED);
  await tap('Land one Infantry');
  expect(button('Land one Infantry')).toHaveClass(DASHED);
  expect(button('Land one Infantry').title).toMatch(/Infantry/);
  expect(id).toBeTruthy();
});

test('the shop of a tactical action: a unit that leads to a warning is dashed and says why, a clean one is plain; it is still bought and warned of', async () => {
  tactical(HOME);
  render(<PlanScreen />);
  await tap(/^Edit: Tactical action/);
  await tap(/^Production/);
  const stage = document.querySelector('.stage-dialog') as HTMLElement;
  // The home planet pays for a cruiser; a war sun needs its technology and twelve resources.
  expect(button('Cruiser', stage)).not.toHaveClass(DASHED);
  expect(button('War Sun', stage)).toHaveClass(DASHED);
  expect(button('War Sun', stage).title).not.toBe('War Sun');
  expect(button('War Sun', stage)).toBeEnabled();
  await tap('War Sun', stage);
  expect([...stage.querySelectorAll('.warning-list li')].length).toBeGreaterThan(0);
});

test('the payment: an exhausted planet and a trade good the player does not have are dashed and say why', async () => {
  // The first action exhausts Nestphar; the second pays with it again.
  edits.addEntry(1, { type: 'tactical', systemId: HOME, moves: [], landings: [], production: { cruiser: 1 }, payment: { planets: ['nestphar'], tradeGoods: 0 } }, 'action');
  edits.addEntry(1, { type: 'tactical', systemId: TARGET, moves: [], landings: [], production: { infantry: 2 }, payment: { planets: ['nestphar'], tradeGoods: 0 } }, 'action');
  render(<PlanScreen />);
  await userEvent.click(screen.getAllByRole('button', { name: /^Edit: Tactical action/ })[1]);
  await tap('Choose manually');
  const planets = screen.getByRole('group', { name: 'Planets to pay with' });
  const nestphar = within(planets).getByRole('button', { name: /Nestphar/ });
  expect(nestphar).toHaveClass('would-warn');
  expect(nestphar.title).toMatch(/exhausted/i);
  expect(nestphar).toBeEnabled();
  expect(button('Add one trade good')).toHaveClass('would-warn');
  expect(button('Add one trade good')).toBeEnabled();
});
