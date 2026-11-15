/**
 * An editor is by the player of its action, whoever sits at the tablet: the reminders, the payment, the tokens and the
 * components offered are that player's. What another player may answer with is still reminded of, and names its holder.
 */
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as edits from '../../testing/entries';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../data/loadPack';
import { componentsOf, ownedBy } from '../../domain/components';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { opponentAt } from '../../testing/store';
import { PlanScreen } from './PlanScreen';

const pack = loadPack(['pok']);
const TARGET = '0,1';
const TACTICAL = { type: 'tactical', systemId: TARGET, moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } };

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
});

/** A game of four: `viewer` at the tablet, `rival` at the next seat. */
function start(viewer: string, rival: string): string {
  useGame.getState().closeGame();
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: viewer }, pack);
  useGame.getState().setFaction(opponentAt(0), rival);
  useGame.getState().setTile(TARGET, '25');
  return opponentAt(0);
}

const panel = () => document.querySelector<HTMLElement>('.plan-panel')!;
/** The reminders the panel shows: the name of each and whose it says it is ('' for the player of the action). */
const reminders = (): Record<string, string> => Object.fromEntries([...panel().querySelectorAll('.step-hints .component-card')].map(card => [
  card.querySelector('b')?.textContent ?? '', card.querySelector('.component-owner')?.textContent ?? '',
]));
const open = async (name: RegExp) => userEvent.click(screen.getByRole('button', { name }));

describe('a tactical action of another player', () => {
  test('reminds of that player\'s abilities; what the player at the tablet may answer with names its holder', async () => {
    const rival = start('naalu', 'sardakk');
    edits.addEntry(1, TACTICAL as never, 'action', rival);
    render(<PlanScreen />);
    await open(/^Edit: Sardakk: Tactical action/);
    const shown = reminders();
    // Sardakk's own ability stands as the action's.
    expect(shown.Unrelenting).toBe('');
    // Foresight answers another player's movement: it is Naalu's, and says so.
    expect(shown.Foresight).toBe('Naalu');
    // Nothing of another player stands unnamed among the reminders of the action.
    const naalu = ['Foresight', 'Telepathic'];
    for (const name of naalu) if (name in shown) expect(shown[name]).toBe('Naalu');
  });

  test('in my own action my reminders are the action\'s, and those of the others name them', async () => {
    const rival = start('sardakk', 'naalu');
    void rival;
    edits.addEntry(1, TACTICAL as never, 'action');
    render(<PlanScreen />);
    await open(/^Edit: Tactical action/);
    expect(reminders()).toMatchObject({ Unrelenting: '', Foresight: 'Naalu' });
  });

  test('pays for its production with that player\'s planets and tokens', async () => {
    const rival = start('naalu', 'sardakk');
    const home = Object.entries(useGame.getState().saved!.table.map).find(([, tile]) => tile === pack.factions.sardakk.homeTile)![0];
    const id = edits.addEntry(1, { ...TACTICAL, systemId: home } as never, 'action', rival);
    act(() => edits.updateEntry(id, { production: { carrier: 1 } }));
    render(<PlanScreen />);
    await open(/^Edit: Sardakk: Tactical action/);
    await userEvent.click(screen.getByRole('button', { name: 'Choose manually' }));
    const planets = within(screen.getByRole('group', { name: 'Planets to pay with' }));
    expect(planets.getByRole('button', { name: /Tren'lak/ })).toBeVisible();
    expect(planets.queryByRole('button', { name: /Maaluuk|Druaa/ })).toBeNull();
  });
});

describe('a strategy card played by another player', () => {
  test('reminds of that player\'s abilities; another player\'s own name their holder', async () => {
    const rival = start('yssaril', 'sardakk');
    edits.addEntry(1, { type: 'strategic', card: 3 } as never, 'action', rival);
    render(<PlanScreen />);
    await open(/^Edit: Sardakk: Strategy: Politics/);
    // Scheming speaks of the cards its holder draws: with the secondary of Politics that is Yssaril, not the one who plays the card.
    expect(reminders().Scheming).toBe('Yssaril');
  });
});

describe('a component action of another player', () => {
  test('offers that player\'s components first', async () => {
    const rival = start('naalu', 'sol');
    edits.addEntry(1, { type: 'component', note: '' } as never, 'action', rival);
    render(<PlanScreen />);
    await open(/^Edit: Sol: Component action/);
    await userEvent.click(screen.getByRole('button', { name: 'Choose the component' }));
    const offered = [...within(screen.getByRole('dialog')).getAllByTestId(/^component-/)].map(card => card.querySelector('b')?.textContent);
    // What is ready on Sol's sheet stands first; nothing of Naalu's sheet is offered before a search.
    expect(offered.slice(0, 3)).toContain('Orbital Drop');
    const naalu = componentsOf(pack).filter(c => ownedBy(c, 'naalu')).map(c => c.name);
    expect(offered.filter(name => naalu.includes(name ?? ''))).toEqual([]);
  });
});

describe('the status turn of another player', () => {
  test('counts that player\'s tokens and lists that player first', async () => {
    const rival = start('naalu', 'sol');
    act(() => { useGame.getState().addStatusTurn(1, rival); });
    render(<PlanScreen />);
    await open(/^Edit: Sol: Tokens and points/);
    // Versatile: Sol gains a token more.
    expect(screen.getByText('Distribute tokens: 3 left')).toBeVisible();
    const first = panel().querySelector('.status-player');
    expect(first).toHaveTextContent(/^Sol/);
    expect(reminders().Versatile ?? '').toBe('');
  });
});
