import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { autoPay } from '../../domain/payment';
import { stateBeforeEntry } from '../../domain/project';
import type { CardEntry } from '../../domain/strategy';
import { unitStats } from '../../domain/unitStats';
import type { Entry, ExpansionId } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { PlanScreen } from '../screens/PlanScreen';

const HOME = '1,0';
const OTHER = '0,1';
const store = () => useGame.getState();
const game = () => store().game!;
const round = () => game().plans[0].rounds.at(-1)!;
const entries = () => round().entries;
const cardEntry = () => entries().find((e): e is CardEntry => e.type === 'strategic' || e.type === 'secondary')!;
const tile = (slot: string) => document.querySelector(`[data-slot="${slot}"]`)!;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const click = (name: string | RegExp) => userEvent.click(button(name));
const cell = (name: string) => within(screen.getByRole('group', { name: 'Totals, now and forecast' })).getByRole('group', { name });
const cards = () => within(screen.getByRole('group', { name: 'Card' }));
const tileOf = (name: string) => new RegExp(`^${name}: [+−]?\\d+$`);
const warningsShown = () => within(screen.getByRole('list', { name: 'Warnings' }));

function start({ expansions = ['pok', 'te'] as ExpansionId[], playerCount = 6, faction = 'arborec' } = {}) {
  store().newGame({ expansions, playerCount, faction }, loadPack(expansions));
  store().setTile('0,-3', null);
  store().setTile(HOME, loadPack(expansions).factions[faction].homeTile);
  store().setTile(OTHER, '25');
}

/** Opens the editor through the menu, with a card picked. */
async function open(mode: 'Strategic action' | RegExp, card?: string) {
  render(<PlanScreen />);
  await click('Add action');
  await click(mode);
  if (card) await userEvent.click(cards().getByRole('button', { name: new RegExp(card) }));
}
const primary = (card?: string) => open('Strategic action', card);
const secondary = (card?: string) => open(/^Secondary ability/, card);

beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  start();
});
afterEach(cleanup);

describe('opening', () => {
  test('the planned card fills itself in on a primary, not on a secondary', async () => {
    store().setStrategyCard(1, 5);
    store().setStrategyCard(1, 5);
    await primary();
    expect(cardEntry()).toMatchObject({ type: 'strategic', card: 5, phase: 'action' });
    expect(cards().getByRole('button', { name: /Trade/ })).toHaveAttribute('aria-pressed', 'true');
    await click('Done');
    await click('Add action');
    await click(/^Secondary ability/);
    expect(entries()[1]).toMatchObject({ type: 'secondary' });
    expect((entries()[1] as CardEntry).card).toBeUndefined();
    expect(screen.getByText('Choose a card.')).toBeVisible();
  });

  test('an entry opens the editor again from the list', async () => {
    const id = store().addEntry(1, { type: 'strategic', card: 8, effects: { mecatol: true } }, 'action');
    render(<PlanScreen />);
    await userEvent.click(within(document.querySelector<HTMLElement>(`[data-entry-id="${id}"]`)!).getByRole('button', { name: 'Strategy: Imperial' }));
    expect(button(/Mecatol Rex/)).toHaveAttribute('aria-pressed', 'true');
  });

  test('card text follows the expansions', async () => {
    await primary('Warfare');
    expect(screen.getByText(/tactical action in any system without placing a token/)).toBeVisible();
    expect(screen.getByText('Changed in TE')).toBeVisible();
    cleanup();
    start({ expansions: ['pok'] });
    await primary('Warfare');
    expect(screen.getByText(/off the board/)).toBeVisible();
    expect(screen.queryByText('Changed in TE')).toBeNull();
  });

  test('the menu says so when the primary is played, and still works: 6 players', async () => {
    store().addEntry(1, { type: 'strategic', card: 1 }, 'action');
    render(<PlanScreen />);
    await click('Add action');
    await click('Strategic action · primary already played');
    expect(entries()).toHaveLength(2);
    expect(warningsShown().getByText(/primary has already been played/)).toBeVisible();
  });

  test('at 3 players the second primary takes the other planned card and warns about nothing', async () => {
    start({ playerCount: 3 });
    store().setStrategyCard(1, 5);
    store().setStrategyCard(1, 5);
    store().setStrategyCard(1, 2);
    store().addEntry(1, { type: 'strategic', card: 5 }, 'action');
    render(<PlanScreen />);
    await click('Add action');
    await click('Strategic action');
    expect(entries()[1]).toMatchObject({ card: 2 });
    expect(screen.queryByRole('list', { name: 'Warnings' })).toBeNull();
  });
});

describe('modes and the lock', () => {
  test('the lock note has its place before a choice, empty, so the controls do not move', async () => {
    await primary('Imperial');
    const place = document.querySelector('.strategy-lock');
    expect(place).not.toBeNull();
    expect(place).toHaveTextContent('');
    await click(/Mecatol Rex/);
    expect(document.querySelector('.strategy-lock')).toBe(place);
    expect(place).toHaveTextContent(/A choice has been made/);
  });

  test('modes are free until a choice, and a secondary or a token primary costs a strategy token', async () => {
    await primary('Trade');
    expect(cell('Strategy')).toHaveTextContent(/^Strategy2$/);
    await click('Secondary');
    expect(cardEntry().type).toBe('secondary');
    expect(cell('Strategy')).toHaveTextContent('2 → 1');
    expect(screen.getByText('A secondary costs 1 strategy token.')).toBeVisible();
    await click('Primary for a token');
    expect(cardEntry()).toMatchObject({ type: 'strategic', forToken: true });
    expect(cell('Strategy')).toHaveTextContent('2 → 1');
    expect(screen.getByRole('heading', { name: 'Primary for a token' })).toBeVisible();
    await click('Primary');
    expect(cardEntry().type).toBe('strategic');
    expect(cardEntry().forToken).toBeUndefined();
    await userEvent.click(cards().getByRole('button', { name: /Imperial/ }));
    expect(cardEntry().card).toBe(8);
  });

  test('a choice locks the mode and the other cards, with the note; undoing it frees them', async () => {
    await primary('Imperial');
    expect(screen.queryByText(/A choice has been made/)).toBeNull();
    await click(/Mecatol Rex/);
    expect(screen.getByText(/A choice has been made/)).toBeVisible();
    for (const mode of ['Primary', 'Secondary', 'Primary for a token']) expect(button(mode)).toBeDisabled();
    expect(cards().getByRole('button', { name: /Trade/ })).toBeDisabled();
    expect(cards().getByRole('button', { name: /Imperial/ })).toBeEnabled();
    act(() => store().undo());
    expect(button('Secondary')).toBeEnabled();
  });

  test('cancel removes the entry and all it holds in one undo step', async () => {
    await primary('Construction');
    await click('Build a structure');
    await userEvent.click(tile(HOME));
    await click('PDS');
    await click('PDS');
    await click('Close');
    await click(/^Cancel action/);
    expect(entries()).toEqual([]);
    expect(button('Add action')).toBeVisible();
    act(() => store().undo());
    expect(cardEntry().effects?.structures).toHaveLength(2);
  });

  test('warnings never block: a short strategy token warns and everything stays open', async () => {
    store().addEntry(1, { type: 'adjustment', label: '', delta: { strategy: -2 } }, 'action');
    await secondary('Politics');
    expect(warningsShown().getByText(/Not enough strategy tokens/)).toBeVisible();
    expect(button('Done')).toBeEnabled();
    expect(cardEntry().type).toBe('secondary');
  });
});

describe('Leadership', () => {
  test('primary: three tokens to distribute, bought tokens add to them and cost influence with an automatic payment', async () => {
    await primary('Leadership');
    expect(screen.getByText('Distribute tokens: 3 left')).toBeVisible();
    await click(tileOf('Tactic'));
    expect(screen.getByText('Distribute tokens: 2 left')).toBeVisible();
    expect(button(tileOf('Tactic'))).toHaveTextContent('1');
    expect(cell('Tactic')).toHaveTextContent('3 → 4');
    await click(tileOf('Tactic'));
    await click(tileOf('Fleet'));
    expect(screen.getByText('Distribute tokens: 0 left')).toBeVisible();
    await click(tileOf('Tactic'));
    expect(cardEntry().effects?.tokens).toMatchObject({ tactic: 3, fleet: 1 });
    expect(screen.getByText('Distribute tokens: -1 left')).toBeVisible();
    expect(warningsShown().getByText(/usually from abilities/)).toBeVisible();
    await click('Reset');
    expect(screen.getByText('Distribute tokens: 3 left')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Warnings' })).toBeNull();
    expect(button('Reset')).toBeDisabled();
    await click('Add one Buy with influence');
    expect(screen.getByText('Distribute tokens: 4 left')).toBeVisible();
    expect(screen.getByText('Bought 1, influence 3.')).toBeVisible();
    expect(cardEntry().effects?.payment?.planets.length).toBeGreaterThan(0);
    expect(within(screen.getByRole('group', { name: 'Payment' })).getByText(/3/)).toBeVisible();
  });

  test('a manual payment stays as chosen when the cost changes', async () => {
    await primary('Leadership');
    await click('Add one Buy with influence');
    const before = cardEntry().effects?.payment;
    await click('Choose manually');
    await click('Add one Buy with influence');
    expect(cardEntry().effects?.payment).toEqual(before);
    await click('Pick automatically');
    expect(cardEntry().effects).toMatchObject({ boughtTokens: 2 });
    expect(cardEntry().effects?.payment).toEqual(autoPay(stateBeforeEntry(game(), game().plans[0], cardEntry().id, loadPack(['pok', 'te'])), 6, 'influence', loadPack(['pok', 'te'])));
  });

  test('secondary: nothing free to distribute, a tap still adds and warns, and no strategy token is charged', async () => {
    await secondary('Leadership');
    expect(screen.getByText('Distribute tokens: 0 left')).toBeVisible();
    await click(tileOf('Fleet'));
    expect(cardEntry().effects?.tokens).toMatchObject({ fleet: 1 });
    expect(warningsShown().getByText(/usually from abilities/)).toBeVisible();
    expect(cell('Strategy')).toHaveTextContent(/^Strategy2$/);
    expect(screen.queryByText('A secondary costs 1 strategy token.')).toBeNull();
  });
});

describe('Diplomacy', () => {
  /** Hacan's three home planets and the one on the other tile, all mine and all spent. */
  const spentAcrossTheMap = () => {
    start({ faction: 'hacan' });
    const data = loadPack(['pok', 'te']);
    const home = data.tiles[data.factions.hacan.homeTile].planetIds;
    const far = data.tiles['25'].planetIds[0];
    store().setPlanetControl(far, 'me');
    store().addEntry(1, { type: 'expedition', sliceId: null, payment: { planets: [...home, far], tradeGoods: 0 } }, 'action');
    return { home, far, name: (id: string) => new RegExp(data.planets[id].name) };
  };
  const readyList = () => within(screen.getByRole('group', { name: 'Ready planets' }));

  test('the secondary lists my exhausted planets across the map, up to 2, with no system to pick', async () => {
    const { home, far, name } = spentAcrossTheMap();
    await secondary('Diplomacy');
    expect(screen.queryByRole('button', { name: /^Choose a system/ })).toBeNull();
    expect(readyList().getAllByRole('button')).toHaveLength(home.length + 1);
    await userEvent.click(readyList().getByRole('button', { name: name(home[0]) }));
    await userEvent.click(readyList().getByRole('button', { name: name(far) }));
    expect(cardEntry().effects?.readied).toEqual([home[0], far]);
    expect(readyList().getByRole('button', { name: name(home[1]) })).toBeDisabled();
  });

  test('a planet that is not exhausted is not listed', async () => {
    await secondary('Diplomacy');
    expect(screen.queryByRole('group', { name: 'Ready planets' })).toBeNull();
    expect(screen.getByText('No planets of yours are exhausted at this point.')).toBeVisible();
  });

  test('the primary picks a system for the others, and that does not limit or clear the planets', async () => {
    const { home, far, name } = spentAcrossTheMap();
    await primary('Diplomacy');
    await click('Choose a system with your planet');
    expect(screen.getByRole('status')).toHaveTextContent('Tap a tile on the map.');
    await userEvent.click(tile(HOME));
    expect(cardEntry().effects?.systemId).toBe(HOME);
    expect(screen.queryByRole('status')).toBeNull();
    await userEvent.click(readyList().getByRole('button', { name: name(far) }));
    await click(/^Choose a system with your planet/);
    await userEvent.click(tile(OTHER));
    expect(cardEntry().effects).toMatchObject({ systemId: OTHER, readied: [far] });
    expect(readyList().getAllByRole('button')).toHaveLength(home.length + 1);
  });

  test('the base primary readies in that system only, and a new system clears them', async () => {
    start({ expansions: [], faction: 'sol' });
    const data = loadPack([]);
    const [planet] = data.tiles[data.factions.sol.homeTile].planetIds;
    await primary('Diplomacy');
    await click('Choose a system with your planet');
    await userEvent.click(tile(HOME));
    await userEvent.click(readyList().getByRole('button', { name: new RegExp(data.planets[planet].name) }));
    expect(cardEntry().effects?.readied).toEqual([planet]);
    await click(/^Choose a system with your planet/);
    await userEvent.click(tile(OTHER));
    expect(cardEntry().effects?.readied).toBeUndefined();
  });

  test('the primary does not offer Mecatol Rex as valid, but it can still be tapped', async () => {
    const CENTRE = '0,0';
    store().setTile(CENTRE, '112');
    store().setPlanetControl('mrte', 'me');
    await primary('Diplomacy');
    await click('Choose a system with your planet');
    expect(tile(CENTRE).getAttribute('class')).not.toContain('valid');
    expect(tile(HOME).getAttribute('class')).toContain('valid');
    await userEvent.click(tile(CENTRE));
    expect(cardEntry().effects?.systemId).toBe(CENTRE);
  });

  test('the base game primary has no limit of two', async () => {
    start({ expansions: [] });
    await primary('Diplomacy');
    await click('Choose a system with your planet');
    await userEvent.click(tile(HOME));
    expect(screen.getByRole('group', { name: 'Ready planets' })).toHaveTextContent(/^Ready planets(?!, up to 2)/);
  });
});

describe('Politics', () => {
  test('the speaker goes to one opponent, the rest is shown only', async () => {
    await primary('Politics');
    const speaker = within(screen.getByRole('group', { name: 'The speaker passes to' }));
    const [first, second] = speaker.getAllByRole('button');
    await userEvent.click(first);
    expect(cardEntry().effects?.speaker).toBe(game().opponents[0].id);
    await userEvent.click(second);
    expect(first).toHaveAttribute('aria-pressed', 'false');
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/\+2 action cards, 2 agendas/)).toBeVisible();
  });

  test('the secondary has no speaker', async () => {
    await secondary('Politics');
    expect(screen.queryByRole('group', { name: 'The speaker passes to' })).toBeNull();
    expect(screen.getByText('+2 action cards.')).toBeVisible();
  });
});

describe('Construction', () => {
  test('opens the shop limited to structures; they stay in the entry, off the game, and can be taken back', async () => {
    const docks = [...game().docks];
    await primary('Construction');
    await click('Build a structure');
    await userEvent.click(tile(HOME));
    const shop = within(screen.getByRole('dialog'));
    expect(shop.queryByRole('button', { name: 'Carrier' })).toBeNull();
    expect(shop.queryByRole('button', { name: 'Build' })).toBeNull();
    await userEvent.click(shop.getByRole('button', { name: 'PDS' }));
    expect(cardEntry().effects?.structures).toMatchObject([{ kind: 'pds' }]);
    expect(game().pds).toEqual({});
    expect(game().docks).toEqual(docks);
    const ringed = document.querySelector('.stage-hex [data-stack="me|pds|0"] .token-hit');
    expect(ringed).not.toBeNull();
    await userEvent.click(ringed!);
    expect(cardEntry().effects?.structures).toBeUndefined();
  });

  test('with Thunder\'s Edge the primary also produces in a dock, limited to units, with payment', async () => {
    await primary('Construction');
    await click(/^Production in a space dock/);
    await userEvent.click(tile(HOME));
    const shop = within(screen.getByRole('dialog'));
    expect(shop.queryByRole('button', { name: 'PDS' })).toBeNull();
    await userEvent.click(shop.getByRole('button', { name: 'Cruiser' }));
    expect(cardEntry().effects).toMatchObject({ production: { systemId: HOME, units: { cruiser: 1 } } });
    expect(cardEntry().effects?.payment?.planets.length).toBeGreaterThan(0);
    await click('Close');
    expect(screen.getByText(/^Built: tile .*Cruiser 1$/)).toBeVisible();
    await click(/^Production in a space dock.*· tile/);
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cruiser' })).toHaveTextContent('+1');
  });

  test('its secondary, and every use before Thunder\'s Edge, has no dock production', async () => {
    await secondary('Construction');
    expect(screen.queryByRole('button', { name: /^Production in a space dock/ })).toBeNull();
    cleanup();
    start({ expansions: ['pok'] });
    await primary('Construction');
    expect(screen.queryByRole('button', { name: /^Production in a space dock/ })).toBeNull();
  });
});

describe('Trade', () => {
  test('the primary shows +3 trade goods and picks the free players', async () => {
    await primary('Trade');
    expect(cell('Trade goods')).toHaveTextContent('0 → 3');
    const free = within(screen.getByRole('group', { name: 'Who uses the secondary for free' })).getAllByRole('button');
    await userEvent.click(free[0]);
    await userEvent.click(free[1]);
    expect(cardEntry().effects?.freeSecondary).toEqual([game().opponents[0].id, game().opponents[1].id]);
    await userEvent.click(free[0]);
    expect(cardEntry().effects?.freeSecondary).toEqual([game().opponents[1].id]);
  });

  test('the secondary only replenishes', async () => {
    await secondary('Trade');
    expect(screen.getByText('Commodities replenish.')).toBeVisible();
    expect(cell('Trade goods')).toHaveTextContent(/^Trade goods0$/);
  });
});

describe('Warfare', () => {
  const tacticalOf = () => entries().find((e): e is Extract<Entry, { type: 'tactical' }> => e.type === 'tactical')!;

  test('the primary starts a free tactical with the route editor, then comes back; the system still gets its token', async () => {
    await primary('Warfare');
    await click('Start a tactical action without a token');
    expect(screen.getByRole('status')).toHaveTextContent('no tactic token is spent');
    await userEvent.click(tile(OTHER));
    expect(tacticalOf()).toMatchObject({ systemId: OTHER, free: true, fromCard: cardEntry().id });
    expect(cell('Tactic')).toHaveTextContent(/^Tactic3$/);
    expect(screen.getByText(/no command token goes down/)).toBeVisible();
    expect(within(tile(OTHER) as HTMLElement).queryByRole('img', { name: 'Command token' })).toBeNull();
    await click('Done editing');
    expect(button(/^Tactical action without a token/)).toBeVisible();
    expect(button('Secondary')).toBeDisabled();
    await click(/^Tactical action without a token/);
    expect(button('Done editing')).toBeVisible();
  });

  test('cancelling the card takes the free tactical with it, and one undo brings both back', async () => {
    await primary('Warfare');
    await click('Start a tactical action without a token');
    await userEvent.click(tile(OTHER));
    await click('Done editing');
    await click(/^Cancel action/);
    expect(entries()).toEqual([]);
    act(() => store().undo());
    expect(entries().map(e => e.type)).toEqual(['strategic', 'tactical']);
  });

  test('backing out of the system pick returns to the card', async () => {
    await primary('Warfare');
    await click('Start a tactical action without a token');
    await click('Cancel');
    expect(button('Start a tactical action without a token')).toBeVisible();
    expect(entries()).toHaveLength(1);
  });

  test('with Thunder\'s Edge a tile takes a token from the fullest pool, signed on the tiles; reset clears it', async () => {
    await primary('Warfare');
    expect(screen.queryByRole('button', { name: /^Take a command token off/ })).toBeNull();
    expect(button('Reset')).toBeDisabled();
    await click(tileOf('Fleet'));
    expect(cardEntry().effects?.tokens).toEqual({ tactic: -1, fleet: 1 });
    expect(button('Fleet: +1')).toHaveTextContent('+1');
    expect(button('Tactic: −1')).toHaveTextContent('−1');
    expect(cell('Tactic')).toHaveTextContent('3 → 2');
    expect(cell('Fleet')).toHaveTextContent('3 → 4');
    expect(cell('Strategy')).toHaveTextContent(/^Strategy2$/);
    await click(tileOf('Strategy'));
    expect(cardEntry().effects?.tokens).toEqual({ tactic: -1, fleet: 0, strategy: 1 });
    await click('Reset');
    expect(cell('Tactic')).toHaveTextContent(/^Tactic3$/);
    expect(button('Secondary')).toBeEnabled();
  });

  test('taking from empty pools goes below zero and warns', async () => {
    store().addEntry(1, { type: 'adjustment', label: '', delta: { tactic: -3, fleet: -3, strategy: -2 } }, 'action');
    await primary('Warfare');
    await click(tileOf('Fleet'));
    expect(warningsShown().getByText(/below zero/)).toBeVisible();
  });

  test('before Thunder\'s Edge there is no free tactical: a token comes off a chosen system and one is gained', async () => {
    start({ expansions: ['pok'] });
    const token = store().addEntry(1, { type: 'tactical', systemId: OTHER, moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }, 'action');
    await primary('Warfare');
    expect(screen.queryByRole('button', { name: /tactical action without a token/ })).toBeNull();
    expect(screen.queryByText(/Opens the usual flight/)).toBeNull();
    expect(within(tile(OTHER) as HTMLElement).getByRole('img', { name: 'Command token' })).toBeInTheDocument();
    await click('Take a command token off a system');
    expect(tile(OTHER).getAttribute('class')).toContain('valid');
    expect(tile(HOME).getAttribute('class')).not.toContain('valid');
    await userEvent.click(tile(OTHER));
    expect(cardEntry().effects?.systemId).toBe(OTHER);
    expect(within(tile(OTHER) as HTMLElement).queryByRole('img', { name: 'Command token' })).toBeNull();
    expect(entries().some(e => e.id === token)).toBe(true);
    expect(screen.getByText('Distribute tokens: 1 left')).toBeVisible();
    await click(tileOf('Fleet'));
    expect(cell('Fleet')).toHaveTextContent('3 → 4');
    expect(cell('Tactic')).toHaveTextContent('3 → 2');
    expect(screen.getByText('Distribute tokens: 0 left')).toBeVisible();
    await click(tileOf('Strategy'));
    expect(cell('Strategy')).toHaveTextContent('2 → 3');
    expect(cell('Fleet')).toHaveTextContent(/^Fleet3$/);
  });

  test('the shop is priced at the upgrades before the entry, not those of the round\'s end', async () => {
    start({ faction: 'muaat' });
    const all = loadPack(['pok', 'te']);
    const cost = (upgraded: boolean) => unitStats('muaat', 'warsun', upgraded, all)?.cost;
    expect(cost(true)).not.toBe(cost(false));
    const id = store().addEntry(1, { type: 'secondary', card: 6 }, 'action');
    store().addEntry(1, { type: 'secondary', card: 7, upgrades: ['warsun'] }, 'action');
    render(<PlanScreen />);
    await userEvent.click(within(document.querySelector<HTMLElement>(`[data-entry-id="${id}"]`)!).getByRole('button', { name: 'Secondary: Warfare' }));
    await click('Production in the home system');
    const warsun = within(screen.getByRole('dialog')).getByRole('button', { name: 'War Sun' });
    expect(warsun).toHaveTextContent(String(cost(false)));
    expect(warsun).not.toHaveTextContent(String(cost(true)));
  });

  test('ground units go to the planet chosen on the hex', async () => {
    start({ faction: 'hacan' });
    const hacan = loadPack(['pok', 'te']);
    const [first, second] = hacan.tiles[hacan.factions.hacan.homeTile].planetIds;
    const later = store().addEntry(1, { type: 'secondary', card: 6 }, 'action');
    render(<PlanScreen />);
    await userEvent.click(within(document.querySelector<HTMLElement>(`[data-entry-id="${later}"]`)!).getByRole('button', { name: 'Secondary: Warfare' }));
    await click('Production in the home system');
    const shop = within(screen.getByRole('dialog'));
    await userEvent.click(document.querySelector(`.stage-hex [role="button"][aria-label*="${hacan.planets[second].name}"]`)!);
    await userEvent.click(shop.getByRole('button', { name: 'Infantry' }));
    const entry = entries().find(e => e.id === later) as CardEntry;
    expect(entry.effects?.production?.ground).toEqual({ [second]: { infantry: 1 } });
    expect(entry.effects?.production?.ground?.[first]).toBeUndefined();
  });

  test('home production for Creuss opens the off-map home tile, not the gate', async () => {
    const all = loadPack(['pok', 'te']);
    start({ faction: 'ghost' });
    store().setTile(HOME, all.factions.ghost.gateTile!);
    await secondary('Warfare');
    await click('Production in the home system');
    expect(screen.getByRole('dialog', { name: `Tile ${all.tiles[all.factions.ghost.homeTile].number}` })).toBeVisible();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Infantry' }));
    expect(cardEntry().effects?.production?.systemId).toBe(all.factions.ghost.homeTile);
  });

  test('the secondary opens the shop for home, limited to units, and pays', async () => {
    await secondary('Warfare');
    await click('Production in the home system');
    const shop = within(screen.getByRole('dialog'));
    expect(shop.queryByRole('button', { name: 'PDS' })).toBeNull();
    await userEvent.click(shop.getByRole('button', { name: 'Carrier' }));
    expect(cardEntry().effects?.production).toMatchObject({ systemId: HOME, units: { carrier: 1 } });
    await click('Close');
    expect(button('Production in the home system')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Payment' })).toBeVisible();
  });

  test('no home on the map, no shop', async () => {
    store().setTile(HOME, null);
    await secondary('Warfare');
    expect(button('Production in the home system')).toBeDisabled();
    expect(screen.getByText('The home system is not on the map.')).toBeVisible();
  });
});

describe('Technology', () => {
  test('the primary: the first is free, the second costs 6, with a payment and a warning when short', async () => {
    await primary('Technology');
    const row = within(screen.getByRole('group', { name: 'Upgrade' }));
    await userEvent.click(row.getByRole('button', { name: 'Carrier' }));
    expect(cardEntry().upgrades).toEqual(['carrier']);
    expect(screen.queryByRole('group', { name: 'Payment' })).toBeNull();
    await userEvent.click(row.getByRole('button', { name: 'Cruiser' }));
    expect(screen.getByText(/Cost now: 6/)).toBeVisible();
    expect(screen.getByRole('group', { name: 'Payment' })).toBeVisible();
    expect(screen.getByText(/The app does not track other technologies/)).toBeVisible();
  });

  test('the secondary costs 4 each, and the mark locks the card', async () => {
    await secondary('Technology');
    await userEvent.click(within(screen.getByRole('group', { name: 'Upgrade' })).getByRole('button', { name: 'Carrier' }));
    expect(screen.getByText(/Now: 4/)).toBeVisible();
    expect(cards().getByRole('button', { name: /Trade/ })).toBeDisabled();
  });
});

describe('entries saved before cards', () => {
  test('their upgrades stay visible on any card and can be taken off', async () => {
    const id = store().addEntry(1, { type: 'secondary', upgrades: ['carrier'] }, 'action');
    render(<PlanScreen />);
    await userEvent.click(within(document.querySelector<HTMLElement>(`[data-entry-id="${id}"]`)!).getByRole('button', { name: 'Secondary' }));
    const row = () => within(screen.getByRole('group', { name: 'Upgrade' }));
    expect(row().getByRole('button', { name: 'Carrier' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(cards().getByRole('button', { name: /Trade/ }));
    expect(row().getByRole('button', { name: 'Carrier' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('picking Technology on an old secondary seeds the payment for its upgrades', async () => {
    const id = store().addEntry(1, { type: 'secondary', upgrades: ['carrier'] }, 'action');
    render(<PlanScreen />);
    await userEvent.click(within(document.querySelector<HTMLElement>(`[data-entry-id="${id}"]`)!).getByRole('button', { name: 'Secondary' }));
    await userEvent.click(cards().getByRole('button', { name: /Technology/ }));
    expect(cardEntry().effects?.payment?.planets.length).toBeGreaterThan(0);
  });
});

describe('Imperial', () => {
  test('Mecatol Rex on the primary is a point, and toggles off', async () => {
    await primary('Imperial');
    await click(/Mecatol Rex/);
    expect(cell('VP')).toHaveTextContent('0 → 1');
    await click(/Mecatol Rex/);
    expect(cell('VP')).toHaveTextContent(/^VP0$/);
    expect(screen.getByText(/Otherwise draw a secret objective/)).toBeVisible();
  });

  test('the secondary draws a secret objective only', async () => {
    await secondary('Imperial');
    expect(screen.queryByRole('button', { name: /Mecatol Rex/ })).toBeNull();
    expect(screen.getByText('Draw a secret objective.')).toBeVisible();
  });
});
