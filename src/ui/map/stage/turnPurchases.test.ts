import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as edits from '../../../testing/entries';

vi.mock('../../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
}));

import { loadPack } from '../../../data/loadPack';
import { cardChange, CARD, withProduction, withStructure, type CardEntry } from '../../../domain/strategy';
import { stateBeforeEntry } from '../../../domain/project';
import { useGame } from '../../../state/gameStore';
import { writeTurn } from '../../../state/turnBridge';
import { kernelViewOf } from '../../testing/view';
import { turnPurchases } from './turnPurchases';

const pack = loadPack(['pok']);
const act = () => useGame.getState();
const cardEntry = () => act().game!.plans[0].rounds[0].entries.find((e): e is CardEntry => e.type === 'strategic' || e.type === 'secondary')!;
const [planet] = pack.tiles['20'].planetIds;

beforeEach(() => {
  act().newGame({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, pack);
  act().setTile('B', '20');
  act().setPlanetControl(planet, 'me');
  edits.addEntry(1, { type: 'secondary', card: CARD.construction, effects: { systemId: 'B' } }, 'action');
});

describe('what the big hex buys for a card', () => {
  test.each([false, true])('a tap writes the effects the old purchase wrote, manual payment %s', manual => {
    const game = act().game!;
    const entry = cardEntry();
    const before = stateBeforeEntry(game, game.plans[0], entry.id, pack);
    const view = kernelViewOf(game, pack, entry.id);
    const write = writeTurn(view.table, game, entry.id, pack)!;
    const target = turnPurchases(view, pack, write, 'B', manual, { before, holdings: before.holdings })!;
    target.change('infantry', planet, 1);
    const effects = (entry.effects ?? {});
    const expected = cardChange(entry, { effects: withProduction(effects, 'B', 'infantry', planet, 1) }, before, 'sol', pack, manual, game).effects;
    expect(cardEntry().effects).toEqual(expected);
    const next = writeTurn(view.table, act().game!, entry.id, pack)!;
    const again = turnPurchases(view, pack, next, 'B', manual, { before, holdings: before.holdings })!;
    expect(again.bought).toContainEqual({ unit: 'infantry', planetId: planet, count: 1 });
    const built = withStructure(cardEntry().effects ?? {}, 'pds', planet, 1).structures;
    again.changeStructure!('pds', planet, 1);
    expect(cardEntry().effects?.structures).toEqual(built);
  });
});
