import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../domain/newGame';
import { stateBeforeEntry } from '../../domain/project';
import { gameAs } from '../../domain/players';
import { upgradesOf as upgradesHeld } from '../../domain/holdings';
import * as old from '../../domain/strategy';
import type { Entry, Game } from '../../domain/types';
import { turnOf } from '../fromLegacy';
import { playerOfKey } from '../keys';
import { upgradesOf } from '../queries';
import { timelineOf } from '../../state/projection';
import * as read from './strategicRead';
import * as now from './strategic';
import { legacyEntry } from '../entry';

const pack = loadPack(['pok']);
const { CARD } = old;
const [pb] = pack.tiles['20'].planetIds;
const [pa] = pack.tiles['19'].planetIds;
let n = 0;
const entry = (body: Record<string, unknown>): Entry => ({ id: `d${++n}`, phase: 'action', status: 'planned', ...body }) as Entry;

const BODIES: Record<string, unknown>[] = [
  { type: 'strategic', card: CARD.leadership, effects: { boughtTokens: 1, payment: { planets: [pa], tradeGoods: 0 } } },
  { type: 'strategic', card: CARD.diplomacy, effects: { systemId: 'B', readied: [pb] } },
  { type: 'strategic', card: CARD.diplomacy },
  { type: 'secondary', card: CARD.diplomacy, effects: { readied: [pa] } },
  { type: 'strategic', card: CARD.imperial },
  { type: 'secondary', card: CARD.warfare },
  { type: 'strategic', card: CARD.technology, effects: { researched: ['neural-motivator', 'antimass-deflectors'] } },
];

describe.each([
  ['sol', 'pok'], ['arborec', 'pok'], ['titans', 'pok'],
])('the readers of the board for the card editors, %s', faction => {
  const g: Game = createGame({ expansions: ['pok'], playerCount: 3, faction }, pack);
  g.map = { A: '19', B: '20', C: '26', M: '18', H: pack.factions[faction].homeTile };
  g.planetControl = { [pb]: 'me', [pa]: 'me' };
  const entries = BODIES.map(b => entry(b));
  g.plans[0].rounds = [{ number: 1, strategyCard: CARD.leadership, backupCard: CARD.technology, entries }];
  const line = timelineOf(g, g.plans[0], 'forecast', pack);
  const { table } = line.kernel;

  test.each(entries.map((_, i) => i))('ready choices, Mecatol, upgrades, entry %i', i => {
    const e = entries[i];
    const turn = turnOf(table, e, pack) as read.CardTurn;
    const board = line.kernel.byTurn.get(e.id)!.before;
    const before = stateBeforeEntry(g, g.plans[0], e.id, pack);
    expect(read.readyChoicesOn(table, board, pack, turn).map(p => p.id).sort()).toEqual(old.readyChoices(g, e as old.CardEntry, before, pack).map(p => p.id).sort());
    expect(read.controlsMecatolOn(board, turn.player)).toBe(old.controlsMecatol(before));
    expect([...upgradesOf(board, pack, turn.player)].sort()).toEqual([...upgradesHeld(before.holdings, pack)].sort());
  });

  test('the home slot of the table player stands where the old home does', () => {
    expect(read.homeSlotOn(table, pack, table.viewer)).toBe(old.homeSlot(g, pack));
    for (const o of g.opponents) {
      const player = playerOfKey(table, o.id)!;
      expect(read.homeSlotOn(table, pack, player)).toBe(old.homeSlot(gameAs(g, o.id), pack));
    }
    expect(read.homeSlotOn({ ...table, map: {} }, pack, table.viewer)).toBe(old.homeSlot({ ...g, map: {} }, pack));
  });
});

describe('a switch of the card reprices as cardChange of a fresh play does', () => {
  const plain = (e: unknown) => {
    const entry = JSON.parse(JSON.stringify(e, (key, value) => {
      if ((key === 'acts' || key === 'effects') && value && (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0)) return undefined;
      return value;
    }));
    if (entry.type === 'secondary') delete entry.forToken;
    return entry;
  };
  const g: Game = createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
  g.map = { A: '19', B: '20', C: '26', M: '18', H: pack.factions.sol.homeTile };
  g.planetControl = { [pb]: 'me', [pa]: 'me' };
  const entries = BODIES.map(b => entry(b));
  g.plans[0].rounds = [{ number: 1, strategyCard: CARD.leadership, backupCard: CARD.technology, entries }];
  const line = timelineOf(g, g.plans[0], 'forecast', pack);
  const { table } = line.kernel;
  const plays = [{ card: CARD.technology, type: 'strategic' }, { card: CARD.trade, type: 'secondary' }, { card: CARD.leadership, type: 'strategic', forToken: true }];

  test.each(entries.map((_, i) => i))('entry %i', i => {
    const e = entries[i];
    const turn = turnOf(table, e, pack);
    const board = line.kernel.byTurn.get(e.id)!.before;
    const before = stateBeforeEntry(g, g.plans[0], e.id, pack);
    for (const manual of [false, true]) {
      for (const play of plays) {
        const expected = old.cardChange(e as old.CardEntry, old.freshPlay(play as old.CardPatch), before, 'sol', pack, manual, g);
        const { type, ...rest } = play;
        const next = now.withFreshChange(table, board, pack, turn, { ...rest, side: type === 'strategic' ? 'primary' : 'secondary' }, manual);
        expect(plain(legacyEntry(table, next))).toEqual(plain({ ...e, ...expected }));
      }
    }
  });
});
