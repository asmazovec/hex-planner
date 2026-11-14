import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { effectOf } from '../domain/effects/registry';
import { landingOffers } from '../domain/effects/points/landing';
import { holderOf } from '../domain/effects/registry';
import { losable, notesOfFirst as oldNotesOfFirst, ownNotes, tradable } from '../domain/holdings';
import { createGame } from '../domain/newGame';
import { autoPay, sliceAutoPayment } from '../domain/payment';
import { setPlayerFaction } from '../domain/players';
import { cardTargets } from '../domain/replay/cards/targets';
import { productionDue } from '../domain/replay/production';
import type { Entry } from '../domain/types';
import { legacyKey, legacyState, tableOf, turnOf } from './fromLegacy';
import { playerOfKey } from './keys';
import {
  autoPayOn, cardTargetsOn, landingOffersOn, losableOf, notesOf, notesOfFirst, playedCostOf, productionDueOnBoard, sliceAutoPaymentOn, tradableOf,
} from './planQueries';
import { initialBoard } from './setup';
import { playedCost } from '../domain/effects/playedCost';

const pack = loadPack(['pok', 'te']);
let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: 'sol' }, pack);
game = setPlayerFaction(game, 1, 'winnu', pack);
const table = tableOf(game);
const board = initialBoard(table, pack);
const old = legacyState(table, board, pack, 'p1');
const key = (id: string) => legacyKey(table, id);

describe('payment from the board', () => {
  const pays = (need: number, kind: 'resources' | 'influence') => [autoPayOn(table, board, pack, 'p1', need, kind), autoPay(old, need, kind, pack, { faction: 'sol' })];
  test('autoPayOn is autoPay, planets and trade goods', () => {
    for (const kind of ['resources', 'influence'] as const) {
      for (const need of [0, 1, 2, 3, 5, 9, 40]) {
        const [now, was] = pays(need, kind);
        expect(now, `${kind} ${need}`).toEqual(was);
      }
    }
    const rich = { ...board, players: { ...board.players, p1: { ...board.players.p1, tradeGoods: 4 } } };
    const oldRich = legacyState(table, rich, pack, 'p1');
    expect(autoPayOn(table, rich, pack, 'p1', 7, 'resources')).toEqual(autoPay(oldRich, 7, 'resources', pack, { faction: 'sol' }));
  });

  test('the expedition slices start paid as before', () => {
    for (const id of ['res5', 'inf5', 'tg3', 'secret', 'tech', null]) {
      expect(sliceAutoPaymentOn(table, board, pack, 'p1', id)).toEqual(sliceAutoPayment(old, id, pack));
    }
  });
});

describe('what a turn costs and owes', () => {
  test('playedCostOf is playedCost of the entry', () => {
    const component = (id: string, uses: string[] = []): Entry => ({ id: 'c', phase: 'action', status: 'planned', type: 'component', note: '', componentId: id, uses }) as Entry;
    for (const id of ['technology:sd', 'technology:amd', 'ability:nonexistent', undefined]) {
      const e = { ...component(id ?? ''), componentId: id } as Entry;
      expect(playedCostOf(table, pack, turnOf(table, e, pack))).toEqual(playedCost(pack, e, effectOf));
    }
  });

  test('productionDueOnBoard is productionDue', () => {
    const e = { id: 't', phase: 'action', status: 'planned', type: 'tactical', systemId: '1', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } } as unknown as Entry;
    for (const units of [{}, { cruiser: 2 }, { fighter: 3, infantry: 2 }, { carrier: 1, dreadnought: 1 }]) {
      expect(productionDueOnBoard(table, board, pack, 'p1', units, turnOf(table, e, pack))).toBe(productionDue(game, old, units, pack, e));
    }
  });
});

describe('what a player holds', () => {
  const holdings = { me: old.holdings, ...Object.fromEntries(Object.entries(old.rivals ?? {}).map(([id, s]) => [id, s.holdings])) };
  test('notesOf is ownNotes, the holder named by player', () => {
    for (const p of table.players) {
      const was = ownNotes(game, pack, key(p.id), holdings);
      const now = notesOf(table, board, pack, p.id);
      const kernelId = (id: string): string => id.replace(/@(.+)$/, (_, who: string) => `@${playerOfKey(table, who) ?? who}`);
      expect(now.map(n => n.id)).toEqual(was.map(n => kernelId(n.id)));
      // At the start everyone holds their own notes; the old holdings are keyed by the old ids.
      expect(now.map(n => n.holder)).toEqual(was.map(() => p.id));
    }
  });

  test('losableOf and tradableOf are losable and tradable', () => {
    const body = { gains: ['actionCard:sabotage1'], spends: ['technology:amd', 'actionCard:sabotage1'] };
    expect([...losableOf(board, 'p1', body)].sort()).toEqual([...losable(old.holdings, body)].sort());
    expect([...losableOf(board, 'p1', {})].sort()).toEqual([...losable(old.holdings, {})].sort());
    const chosen = old.holdings.promissory.slice(0, 1);
    expect([...tradableOf(board, 'p1', chosen)].sort()).toEqual([...tradable(old.holdings, chosen)].sort());
  });

  test('notesOfFirst is the same function', () => {
    const ids = ['promissory:a@p2', 'promissory:b@p1', 'promissory:c@p2'];
    expect(notesOfFirst(ids, 'p2')).toEqual(oldNotesOfFirst(ids, 'p2'));
  });
});

describe('the map', () => {
  test('landingOffersOn is landingOffers of the holder', () => {
    expect(landingOffersOn(table, board, pack, 'p1')).toEqual(landingOffers(pack, holderOf(game, old)));
  });

  test('cardTargetsOn is cardTargets', () => {
    for (const card of [1, 2, 4, 6, 8]) {
      for (const type of ['strategic', 'secondary'] as const) {
        const e = { id: 'c', phase: 'action', status: 'planned', type, card } as Entry as Extract<Entry, { type: 'strategic' | 'secondary' }>;
        for (const pick of ['system', 'build', 'dock'] as const) {
          expect(cardTargetsOn(table, board, board, pack, 'p1', e, pick).sort(), `${type} ${card} ${pick}`)
            .toEqual(cardTargets(game, pack, e, pick, old, old).sort());
        }
      }
    }
  });
});
