import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { PlanScreen } from '../screens/PlanScreen';

const pack = loadPack(['pok']);
const game = () => useGame.getState().game!;
const rival = () => game().opponents[0];

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  setLanguage('en');
  document.elementFromPoint = () => null;
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  useGame.getState().setOpponent(0, { faction: 'hacan' });
});

type Group = 'Technologies' | 'Cards' | 'Faction' | 'Relics' | 'Objectives & laws';
/** The collapsed stack of the components. */
const tab = () => screen.getByRole('button', { name: /^Components/ });
/** A tab of the fan, by the name of its group, whatever it counts. */
const groupTab = (group: Group) => screen.getByRole('button', { name: new RegExp(`^${group}( · \\d+)?$`) });
const rail = () => screen.getAllByRole('group', { name: 'Drawers' })[1];
const railNames = () => within(rail()).getAllByRole('button').map(button => button.textContent);
/** The drawer opened by its stack, on a group of the fan. */
async function openDrawer(group?: Group) {
  render(<PlanScreen />);
  await userEvent.click(tab());
  if (group && groupTab(group).getAttribute('aria-pressed') !== 'true') await userEvent.click(groupTab(group));
  return screen.getByRole('dialog', { name: 'Components' });
}
const drawer = () => screen.getByRole('dialog', { name: 'Components' });
const section = (name: string) => within(drawer()).getByRole('group', { name });
const searchBox = () => within(drawer()).getByRole('searchbox', { name: 'Search components' });

describe('the components drawer', () => {
  test('lists my starting technologies under Technologies, with the unit cards beside them', async () => {
    await openDrawer();
    const technologies = section('Technologies');
    expect(within(technologies).getByText('Magen Defense Grid ΩΩ')).toBeVisible();
    expect(within(technologies).getByTestId('upgrade-carrier')).toBeVisible();
    expect(within(technologies).queryByText('Sarween Tools')).toBeNull();
  });

  test('the tab counts what I hold', async () => {
    render(<PlanScreen />);
    expect(tab()).toHaveAccessibleName('Components · 1');
    useGame.getState().setStartHolding('me', 'relic:shard', true);
    expect(await screen.findByRole('button', { name: 'Components · 2' })).toBeVisible();
  });

  test('a unit card still switches the level of the unit, through its upgrade technology', async () => {
    await openDrawer();
    const carrier = screen.getByTestId('upgrade-carrier');
    expect(carrier).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(carrier);
    expect(game().start.me.technologies).toContain('technology:cv2');
    expect(screen.getByTestId('upgrade-carrier')).toHaveAttribute('aria-pressed', 'true');
  });

  test('an empty section is one line that says so', async () => {
    await openDrawer('Relics');
    const relics = section('Relics');
    expect(relics).toHaveTextContent(/^Relicsnone$/);
    expect(within(relics).queryAllByRole('button')).toHaveLength(0);
  });

  test('a typo still finds the card: it is added from the results and stands under Action cards', async () => {
    await openDrawer('Cards');
    await userEvent.type(searchBox(), 'sabotge');
    const results = await screen.findByRole('group', { name: 'Search results' });
    expect(screen.queryByRole('group', { name: 'Technologies' })).toBeNull();
    await userEvent.click(within(results).getByRole('button', { name: 'Add Sabotage' }));
    expect(game().start.me.hand).toEqual(['actionCard:sabo1']);
    await userEvent.keyboard('{Escape}');
    expect(searchBox()).toHaveValue('');
    expect(within(section('Action cards')).getByText('Sabotage')).toBeVisible();
    // The right drawer stays: Escape only emptied the field.
    expect(drawer()).toBeVisible();
  });

  test('what the player holds stands first in the results, the rest after it with an add button', async () => {
    useGame.getState().setStartHolding('me', 'relic:shard', true);
    await openDrawer();
    await userEvent.type(searchBox(), 'shard of the throne');
    const results = await screen.findByRole('group', { name: 'Search results' });
    const ids = within(results).getAllByTestId(/^component-/).map(card => card.getAttribute('data-testid'));
    expect(ids[0]).toBe('component-relic:shard');
    expect(ids.length).toBeGreaterThan(1);
    expect(within(results).getByRole('button', { name: 'Remove Shard of the Throne' })).toBeVisible();
  });

  test('a component added from the results stays where it is: the list keeps its order while it is asked', async () => {
    await openDrawer();
    await userEvent.type(searchBox(), 'the');
    await screen.findByRole('group', { name: 'Search results' });
    const order = () => within(section('Search results')).getAllByTestId(/^component-/).map(card => card.getAttribute('data-testid'));
    const before = order();
    const third = within(section('Search results')).getAllByRole('button', { name: /^Add / })[2];
    const card = third.closest('[data-testid]')!.getAttribute('data-testid')!;
    await userEvent.click(third);
    expect(order()).toEqual(before);
    // Asked again, what is held now stands first.
    await userEvent.clear(searchBox());
    await userEvent.type(searchBox(), 'the');
    await vi.waitFor(() => expect(order().indexOf(card)).toBeLessThan(before.indexOf(card)));
  });

  test('the cross of the field empties it', async () => {
    await openDrawer();
    await userEvent.type(searchBox(), 'sabo');
    await userEvent.click(screen.getByRole('button', { name: 'Clear the search' }));
    expect(searchBox()).toHaveValue('');
    expect(section('Technologies')).toBeVisible();
  });

  test('a press on a card opens its printed text in place', async () => {
    useGame.getState().setStartHolding('me', 'relic:shard', true);
    await openDrawer('Relics');
    const card = within(section('Relics')).getByTestId('component-relic:shard');
    const text = pack.texts['relic:shard'];
    expect(text.length).toBeGreaterThan(10);
    expect(card).not.toHaveTextContent(text.slice(0, 20));
    await userEvent.click(within(card).getByRole('button', { name: /Shard of the Throne/, expanded: false }));
    expect(card).toHaveTextContent(text.slice(0, 20));
  });

  test('a card held from the start is taken off by its cross', async () => {
    useGame.getState().setStartHolding('me', 'relic:shard', true);
    await openDrawer('Relics');
    await userEvent.click(within(section('Relics')).getByRole('button', { name: 'Remove Shard of the Throne' }));
    expect(game().start.me.relics).toEqual([]);
    expect(section('Relics')).toHaveTextContent(/none$/);
  });

  test('the same action card twice is one card with its count, and a stepper changes it', async () => {
    useGame.getState().setStartHolding('me', 'actionCard:sabo1', true);
    useGame.getState().setStartHolding('me', 'actionCard:sabo1', true);
    await openDrawer('Cards');
    const cards = section('Action cards');
    expect(within(cards).getAllByTestId('component-actionCard:sabo1')).toHaveLength(1);
    expect(cards).toHaveTextContent('×2');
    await userEvent.click(within(cards).getByRole('button', { name: 'Add one In hand' }));
    expect(game().start.me.hand).toHaveLength(3);
    await userEvent.click(within(cards).getByRole('button', { name: 'Remove one In hand' }));
    await userEvent.click(within(cards).getByRole('button', { name: 'Remove one In hand' }));
    expect(game().start.me.hand).toHaveLength(1);
  });

  test('a leader goes round its states: locked, unlocked, exhausted, purged', async () => {
    await openDrawer('Faction');
    const cycle = () => within(section('Leaders')).getByRole('button', { name: /^Letani Ospha: / });
    expect(cycle()).toHaveAccessibleName('Letani Ospha: locked. Change the state');
    await userEvent.click(cycle());
    expect(game().start.me.leaders).toEqual({ 'leader:arborecagent': 'unlocked' });
    expect(cycle()).toHaveAccessibleName('Letani Ospha: unlocked. Change the state');
    await userEvent.click(cycle());
    expect(game().start.me.leaders).toEqual({ 'leader:arborecagent': 'exhausted' });
    await userEvent.click(cycle());
    expect(game().start.me.leaders).toEqual({ 'leader:arborecagent': 'purged' });
    await userEvent.click(cycle());
    expect(game().start.me.leaders).toEqual({});
  });

  test('a rival is shown and edited the same way', async () => {
    await openDrawer();
    await userEvent.click(within(screen.getByRole('group', { name: 'Whose components' })).getByRole('button', { name: /Hacan/ }));
    const technologies = section('Technologies');
    expect(within(technologies).getByText('Sarween Tools')).toBeVisible();
    expect(within(technologies).queryByText('Magen Defense Grid ΩΩ')).toBeNull();
    await userEvent.type(searchBox(), 'stellar converter');
    const results = await screen.findByRole('group', { name: 'Search results' });
    await userEvent.click(within(results).getByRole('button', { name: 'Add Stellar Converter' }));
    expect(game().start.opponents[rival().id].relics).toEqual(['relic:stellarconverter']);
    expect(game().start.me.relics ?? []).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Clear the search' }));
    await userEvent.click(within(section('Technologies')).getByTestId('upgrade-carrier'));
    expect(game().start.opponents[rival().id].technologies).toContain('technology:cv2');
  });

  test('what an entry of the plan brought says its round and cannot be taken off here', async () => {
    useGame.getState().addEntry(1, { type: 'component', note: '', gains: ['relic:shard'] }, 'action');
    await openDrawer('Relics');
    const card = within(section('Relics')).getByTestId('component-relic:shard');
    expect(card).toHaveTextContent('from round 1');
    expect(within(card).queryByRole('button', { name: 'Remove Shard of the Throne' })).toBeNull();
    // Only what is done counts for "now".
    await userEvent.click(screen.getByRole('button', { name: 'Now' }));
    expect(section('Relics')).toHaveTextContent(/none$/);
  });

  test('a holding the data no longer knows shows nothing and breaks nothing', async () => {
    useGame.getState().setStartHolding('me', 'relic:gone', true);
    await openDrawer('Relics');
    expect(section('Relics')).toHaveTextContent(/none$/);
  });
});

describe('the right drawer and the map', () => {
  test('it closes when the map is asked for a system, so the hint and the map are in sight', async () => {
    await openDrawer();
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
    expect(screen.queryByRole('dialog', { name: 'Components' })).toBeNull();
  });

  test('it closes when a strategy card asks the map for a system', async () => {
    useGame.getState().setStrategyCard(1, 2);
    useGame.getState().setStrategyCard(1, 2);
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Strategy' }));
    await userEvent.click(tab());
    expect(drawer()).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /Choose a system with your planet/ }));
    expect(screen.queryByRole('dialog', { name: 'Components' })).toBeNull();
  });
});

describe('the stack and the fan of the component tabs', () => {
  const withTe = () => {
    const te = loadPack(['pok', 'te']);
    useGame.getState().newGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'arborec' }, te);
  };
  const teTab = () => within(rail()).queryByRole('button', { name: /Thunder's Edge|parts/ });

  test('folded, the rail holds one tab of the components over its shades, and the tab of Thunder\'s Edge', () => {
    withTe();
    render(<PlanScreen />);
    expect(within(rail()).getAllByRole('button')).toHaveLength(2);
    expect(tab()).toHaveAttribute('aria-pressed', 'false');
    expect(teTab()).not.toBeNull();
    // The shades are not for the screen reader nor for the finger.
    const shades = rail().querySelectorAll('.tab-fan > [aria-hidden="true"]');
    expect(shades).toHaveLength(4);
    for (const shade of shades) expect(shade).toBeDisabled();
    expect(screen.queryByRole('dialog', { name: 'Components' })).toBeNull();
  });

  test('a press on the stack fans it out by groups, hides the tab of Thunder\'s Edge and opens Technologies first', async () => {
    withTe();
    await openDrawer();
    expect(railNames()).toEqual(['Technologies · 1', 'Cards', 'Faction', 'Relics', 'Objectives & laws']);
    expect(teTab()).toBeNull();
    expect(groupTab('Technologies')).toHaveAttribute('aria-pressed', 'true');
    expect(section('Technologies')).toBeVisible();
    for (const other of ['Action cards', 'Promissory notes', 'Leaders', 'Breakthrough', 'Relics', 'Objectives', 'Laws']) {
      expect(within(drawer()).queryByRole('group', { name: other })).toBeNull();
    }
  });

  test('each group shows its own sections', async () => {
    await openDrawer('Cards');
    const shown = () => within(drawer()).getAllByRole('group').map(group => group.getAttribute('aria-label')).filter(name => name !== 'Whose components');
    expect(shown()).toEqual(['Action cards', 'Promissory notes']);
    await userEvent.click(groupTab('Faction'));
    expect(shown()).toEqual(['Leaders', 'Breakthrough']);
    await userEvent.click(groupTab('Relics'));
    expect(shown()).toEqual(['Relics']);
    await userEvent.click(groupTab('Objectives & laws'));
    expect(shown()).toEqual(['Objectives', 'Laws']);
  });

  test('another tab changes the group, the drawer stays open and no tab leaves its place', async () => {
    await openDrawer();
    const before = railNames();
    await userEvent.click(groupTab('Relics'));
    expect(drawer()).toBeVisible();
    expect(railNames()).toEqual(before);
    expect(groupTab('Relics')).toHaveAttribute('aria-pressed', 'true');
    expect(groupTab('Technologies')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a press on the tab of the open group folds the fan and closes the drawer', async () => {
    withTe();
    await openDrawer('Relics');
    await userEvent.click(groupTab('Relics'));
    expect(screen.queryByRole('dialog', { name: 'Components' })).toBeNull();
    expect(within(rail()).getAllByRole('button')).toHaveLength(2);
    expect(tab()).toBeVisible();
    expect(teTab()).not.toBeNull();
  });

  test('a tab counts what the shown player holds in its group, and says no number for nothing', async () => {
    useGame.getState().setStartHolding('me', 'relic:shard', true);
    useGame.getState().setStartHolding('me', 'actionCard:sabo1', true);
    useGame.getState().setStartHolding('me', 'actionCard:sabo1', true);
    await openDrawer();
    expect(railNames()).toEqual(['Technologies · 1', 'Cards · 2', 'Faction', 'Relics · 1', 'Objectives & laws']);
    await userEvent.click(within(screen.getByRole('group', { name: 'Whose components' })).getByRole('button', { name: /Hacan/ }));
    expect(railNames()).toEqual(['Technologies · 2', 'Cards', 'Faction', 'Relics', 'Objectives & laws']);
  });

  test('the group open last is remembered: the stack opens on it, and its tab stands where the stack was', async () => {
    await openDrawer('Relics');
    expect(localStorage.getItem('ti4.componentsTab')).toBe('relics');
    await userEvent.click(groupTab('Relics'));
    cleanup();
    render(<PlanScreen />);
    await userEvent.click(tab());
    expect(section('Relics')).toBeVisible();
    expect(railNames()).toEqual(['Relics', 'Technologies · 1', 'Cards', 'Faction', 'Objectives & laws']);
    expect(groupTab('Relics')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a query shows its results whatever the group', async () => {
    await openDrawer('Relics');
    await userEvent.type(searchBox(), 'sabotge');
    const results = await screen.findByRole('group', { name: 'Search results' });
    expect(within(results).getByRole('button', { name: 'Add Sabotage' })).toBeVisible();
    expect(within(drawer()).queryByRole('group', { name: 'Relics' })).toBeNull();
  });

  test('the fan folds when the map is asked for a system', async () => {
    await openDrawer('Cards');
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
    expect(screen.queryByRole('dialog', { name: 'Components' })).toBeNull();
    expect(within(rail()).getAllByRole('button')).toHaveLength(1);
    expect(tab()).toHaveAccessibleName('Components · 1');
  });
});
