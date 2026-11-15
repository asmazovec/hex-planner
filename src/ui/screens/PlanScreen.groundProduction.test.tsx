/**
 * Ground forces produced on a planet by a tactical action are drawn as pictures in the production panel of the big hex,
 * as ships are: the tray of the planet's row holds a chip with the unit and its count, for whoever the action belongs to.
 */
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
import { opponentAt, viewerNow } from '../../testing/store';
import { PlanScreen } from './PlanScreen';

const pack = loadPack(['pok']);

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  useGame.getState().closeGame();
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: 'naalu' }, pack);
  useGame.getState().setFaction(opponentAt(0), 'sol');
});

const homeOf = (faction: string): string => Object.entries(useGame.getState().saved!.table.map).find(([, tile]) => tile === pack.factions[faction].homeTile)![0];
const turn = () => useGame.getState().saved!.plans[0].rounds[0].turns[0];

for (const [who, faction, label] of [['the player at the tablet', 'naalu', /^Edit: Tactical action/], ['another player', 'sol', /^Edit: Sol: Tactical action/]] as const) {
  test(`infantry and mechs produced on a planet by ${who} stand as pictures in the tray of the planet's row`, async () => {
    const owner = faction === 'naalu' ? viewerNow() : opponentAt(0);
    edits.addEntry(1, { type: 'tactical', systemId: homeOf(faction), moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } } as never, 'action', owner);
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    await userEvent.click(screen.getByRole('button', { name: /^Production/ }));
    const hex = within(screen.getByRole('dialog'));
    const planet = pack.planets[pack.tiles[pack.factions[faction].homeTile].planetIds[0]];
    const many = pack.tiles[pack.factions[faction].homeTile].planetIds.length > 1;
    const row = () => within(hex.getByRole('group', { name: planet.name }));
    const tray = () => within(row().getByRole('group', { name: 'Bought' }));
    for (const unit of ['Infantry', 'Mech']) {
      const name = many ? `${unit}, ${planet.name}` : unit;
      await userEvent.click(row().getByRole('button', { name }));
      const chip = tray().getByRole('button', { name: `Give back ${name}` });
      expect(chip.querySelector('svg use, svg path, svg g')).not.toBeNull();
      expect(chip).toHaveTextContent('×1');
    }
    const action = turn().action;
    expect(action.kind === 'tactical' && action.production?.units).toEqual({ infantry: 1, mech: 1 });
    // Ships of the same action are drawn the same way.
    const space = within(hex.getByRole('group', { name: 'Space' }));
    await userEvent.click(space.getByRole('button', { name: 'Carrier' }));
    expect(within(space.getByRole('group', { name: 'Bought' })).getByRole('button', { name: 'Give back Carrier' })).toHaveTextContent('×1');
  });
}

const production = () => { const action = turn().action; return action.kind === 'tactical' ? action.production : undefined; };

for (const [who, edit] of [['the player at the tablet', /^Edit: Tactical action/], ['another player', /^Edit: Sol: Tactical action/]] as const) {
  test(`infantry and mechs bought by ${who} on a planet they do not control stand in the tray of that planet's row, and are taken back from it`, async () => {
    useGame.getState().setTile('0,1', '25');
    const owner = who === 'another player' ? opponentAt(0) : viewerNow();
    edits.addEntry(1, { type: 'tactical', systemId: '0,1', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } } as never, 'action', owner);
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: edit }));
    await userEvent.click(screen.getByRole('button', { name: /^Production/ }));
    const hex = within(screen.getByRole('dialog'));
    const row = () => within(hex.getByRole('group', { name: 'Quann' }));
    const tray = () => within(row().getByRole('group', { name: 'Bought' }));
    for (const unit of ['Infantry', 'Mech']) {
      await userEvent.click(row().getByRole('button', { name: unit }));
      await userEvent.click(row().getByRole('button', { name: unit }));
      const chip = tray().getByRole('button', { name: `Give back ${unit}` });
      expect(chip.querySelector('svg')).not.toBeNull();
      expect(chip).toHaveTextContent('×2');
    }
    expect(production()).toMatchObject({ units: { infantry: 2, mech: 2 }, ground: { quann: { infantry: 2, mech: 2 } } });
    // The replay does not put them on a planet that is not the player's (67.4.1): the hex shows them in the space area, the row still holds them.
    await userEvent.click(tray().getByRole('button', { name: 'Give back Mech' }));
    expect(tray().getByRole('button', { name: 'Give back Mech' })).toHaveTextContent('×1');
    await userEvent.click(tray().getByRole('button', { name: 'Give back Mech' }));
    expect(tray().queryByRole('button', { name: 'Give back Mech' })).toBeNull();
    expect(production()).toMatchObject({ units: { infantry: 2 }, ground: { quann: { infantry: 2 } } });
    // A tap on the token where it stands on the hex takes it back from the row it was bought in.
    await userEvent.click(within(hex.getByRole('group', { name: 'Big hex' })).getByRole('button', { name: /^Infantry ×2/ }));
    expect(tray().getByRole('button', { name: 'Give back Infantry' })).toHaveTextContent('×1');
    expect(production()).toMatchObject({ units: { infantry: 1 }, ground: { quann: { infantry: 1 } } });
    expect(useGame.getState().saved!.plans[0].rounds[0].turns).toHaveLength(1);
  });
}
