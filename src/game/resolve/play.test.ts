import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { COMPONENT_FILES, effectOf } from '../../domain/effects/registry';
import { createGame } from '../../domain/newGame';
import { tableOf, turnOf } from '../fromLegacy';
import { applyAll } from '../apply';
import { initialBoard } from '../setup';
import { tactical } from '../../domain/rules/kit';
import type { Entry } from '../../domain/types';
import { resolveTurn } from './index';
import { runPlay } from './play';
import { newTrack } from './track';

const pack = loadPack(['pok']);
const game = createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
const table = tableOf(game);
const start = initialBoard(table, pack);
const [p1, p2] = table.players.map(p => p.id);
const planet = Object.keys(start.planets).find(id => start.planets[id].owner === undefined) ?? Object.keys(start.planets)[0];

describe('the native play of a component', () => {
  test('the plays of Bribery and Cripple Defenses are native functions', () => {
    for (const id of ['actionCard:bribery', 'actionCard:cripple']) {
      expect(effectOf(pack, id)?.play).toBeTypeOf('function');
    }
  });

  test('every action card that plays at a step of an action has a native play', () => {
    const files = Object.values(COMPONENT_FILES).filter(f => f.id.startsWith('actionCard:'));
    expect(files.length).toBeGreaterThan(30);
    // `playAt` is the step a play runs at, read by the runner.
    for (const file of files.filter(f => f.ability.playAt !== undefined)) expect(effectOf(pack, file.id)?.play, file.id).toBeTypeOf('function');
  });

  test('no component file keeps an old-shape effect, and every folder whose components do something when played has plays', () => {
    const files = Object.values(COMPONENT_FILES);
    expect(files.length).toBeGreaterThan(600);
    for (const file of files) expect('effect' in file, file.id).toBe(false);
    // Every folder whose components do something when played has native plays.
    for (const folder of ['actionCard', 'leader', 'legendary', 'technology', 'mech', 'breakthrough', 'ability', 'relic', 'publicObjective', 'exploration', 'promissory', 'agenda']) {
      expect(files.filter(f => f.id.startsWith(folder + ':') && (f.ability as { play?: unknown } | undefined)?.play !== undefined).length, folder).toBeGreaterThan(0);
    }
  });

  test('Bribery: the trade goods chosen leave the holder as an event; more than held is told and nothing goes below zero', () => {
    const board = applyAll(start, [{ type: 'TradeGoodsChanged', player: p1, delta: 3 }]);
    const ok = runPlay(table, board, pack, 'actionCard:bribery', p1, { actor: p1, step: 'component', choices: { tradeGoods: 2 }, held: true });
    expect(ok.events).toEqual([{ type: 'TradeGoodsChanged', player: p1, delta: -2, cause: { step: 'component', component: 'actionCard:bribery' } }]);
    expect(ok.board.players[p1].tradeGoods).toBe(1);
    const over = runPlay(table, board, pack, 'actionCard:bribery', p1, { actor: p1, step: 'component', choices: { tradeGoods: 5 }, held: true });
    expect(over.violations.map(v => v.code)).toEqual(['shortTradeGoods']);
    expect(over.board.players[p1].tradeGoods).toBe(0);
  });

  test('Cripple Defenses: each PDS on the chosen planet goes back to its owner, whoever holds it', () => {
    const board = applyAll(start, [
      { type: 'PlanetGained', player: p2, planet },
      { type: 'StructurePlaced', player: p2, at: { planet }, structures: { pds: 2 } },
    ]);
    const r = runPlay(table, board, pack, 'actionCard:cripple', p1, { actor: p1, step: 'component', choices: { planet }, held: true });
    expect(r.events).toEqual([{ type: 'StructureRemoved', player: p2, at: { planet }, structures: { pds: 2 }, cause: { step: 'component', component: 'actionCard:cripple' } }]);
    expect(r.board.planets[planet].structures.pds ?? 0).toBe(0);
    expect(runPlay(table, start, pack, 'actionCard:cripple', p1, { actor: p1, choices: { planet }, held: true }).events).toEqual([]);
  });
});

describe('what a play is run with, among the plays an entry names', () => {
  const slot = Object.keys(table.map).find(s => table.map[s] !== undefined)!;
  const named = (uses: string[]) => ({ ...tactical(slot), free: true, uses }) as Entry;
  const resolve = (entry: Entry, board = start) => resolveTurn(table, board, turnOf(table, entry, pack), pack, { track: newTrack() });

  test('a native play that asks to run at the activation of a tactical action runs there (Rally: 2 tokens to the fleet pool)', () => {
    const r = resolve(named(['actionCard:rally']));
    expect(r.board.players[p1].pools.fleet).toBe(start.players[p1].pools.fleet + 2);
    expect(r.steps.find(s => s.step === 'activation')?.events.some(e => e.cause?.component === 'actionCard:rally')).toBe(true);
  });

  test('a native play and an old one named by the same entry run in the order the entry names them', () => {
    const board = applyAll(start, [{ type: 'CommoditiesChanged', player: p1, delta: -1 }]);
    // The old play gives 1 trade good (Minent), the native one sets the commodities (Harness).
    const order = (uses: string[]) => resolve(named(uses), board).steps.flatMap(s => s.events).map(e => e.type).filter(t => t === 'TradeGoodsChanged' || t === 'CommoditiesChanged');
    expect(order(['exploration:minent', 'actionCard:harness'])).toEqual(['TradeGoodsChanged', 'CommoditiesChanged']);
    expect(order(['actionCard:harness', 'exploration:minent'])).toEqual(['CommoditiesChanged', 'TradeGoodsChanged']);
  });
});
