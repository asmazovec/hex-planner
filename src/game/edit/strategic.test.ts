import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../testing/old/domain/newGame';
import { stateBeforeEntry } from '../../testing/old/domain/project';
import * as old from '../../domain/strategy';
import * as oldOld from '../../testing/old/domain/strategy';
import { researchTokensGiven } from '../../testing/old/domain/replay/research';
import type { Entry, Game } from '../../testing/old/domain/types';
import { factsOf } from '../turnFacts';
import { planOf, turnOf } from '../../testing/old/game/fromLegacy';
import { timelineOf } from '../../testing/projection';
import * as read from './strategicRead';
import * as now from './strategic';
import { placesOf } from '../../testing/old/domain/replay/production';

const pack = loadPack(['pok']);
const { CARD } = old;
const [pb] = pack.tiles['20'].planetIds;
let n = 0;
const entry = (body: Record<string, unknown>): Entry => ({ id: `c${++n}`, phase: 'action', status: 'planned', ...body }) as Entry;

function build(faction: string, bodies: Record<string, unknown>[], cards: [number | null, number | null] = [CARD.leadership, CARD.technology]) {
  const g: Game = createGame({ expansions: ['pok'], playerCount: 3, faction }, pack);
  g.map = { A: '19', B: '20', C: '26', M: '18', H: pack.factions[faction].homeTile };
  const entries = bodies.map(b => entry(b));
  g.plans[0].rounds = [{ number: 1, strategyCard: cards[0], backupCard: cards[1], entries }];
  const line = timelineOf(g, g.plans[0], 'forecast', pack);
  const { table } = line.kernel;
  const round = planOf(table, g.plans[0], pack)[0];
  const at = (e: Entry) => ({
    e: e as old.CardEntry, turn: turnOf(table, e, pack) as read.CardTurn,
    board: line.kernel.byTurn.get(e.id)!.before, before: stateBeforeEntry(g, g.plans[0], e.id, pack),
  });
  return { g, table, round, entries, at };
}

/** The entry without what the kernel does not keep: no empty transactions, no empty effects, and no flag of a primary on a secondary. */
const plain = (e: unknown) => {
  const entry = JSON.parse(JSON.stringify(e, (key, value) => {
    if (key === 'acts' && Array.isArray(value) && value.length === 0) return undefined;
    if (key === 'effects' && value && Object.keys(value).length === 0) return undefined;
    return value;
  }));
  if (entry.type === 'secondary') delete entry.forToken;
  return entry;
};
const sameEntry = (table: Parameters<typeof factsOf>[0], turn: Parameters<typeof factsOf>[1], e: Entry, patch: Record<string, unknown>) =>
  expect(plain(factsOf(table, turn))).toEqual(plain({ ...e, ...patch }));

const BODIES = [
  { type: 'strategic', card: CARD.leadership, effects: { tokens: { tactic: 4, fleet: 1 }, boughtTokens: 2, payment: { planets: [], tradeGoods: 0 } } },
  { type: 'secondary', card: CARD.technology, effects: { researched: ['neural-motivator'] } },
  { type: 'strategic', card: CARD.technology, effects: { researched: ['neural-motivator', 'antimass-deflectors'], specialties: [pb] } },
  { type: 'strategic', card: CARD.warfare, forToken: true, effects: { systemId: 'A', tokens: { tactic: 1 } } },
  { type: 'secondary', card: CARD.construction, effects: { systemId: 'B', structures: [{ kind: 'pds', planetId: pb }], production: { systemId: 'B', units: { infantry: 1 }, ground: { [pb]: { infantry: 1 } } } } },
  { type: 'strategic', card: CARD.diplomacy, effects: { systemId: 'B', readied: [pb] } },
  { type: 'strategic' },
];
const INDEXES = BODIES.map((_, i) => i);

describe.each(['sol', 'naalu', 'arborec', 'titans'])('the readers of a card turn, %s', faction => {
  const t = build(faction, BODIES);
  const held = old.heldCards(t.g.plans[0].rounds[0], 3);

  test('the round holds the cards the old function counts', () => {
    expect(t.round.held).toEqual(held);
  });

  test.each(INDEXES)('cost, tokens owed, free tokens, research, entry %i', i => {
    const { e, turn, board, before } = t.at(t.entries[i]);
    expect(read.cardCostOn(t.table, board, pack, turn)).toEqual(oldOld.cardCost(e, faction, before.holdings, pack, { game: t.g, state: before }));
    for (const heldOf of [[], held]) {
      expect(read.strategyTokensOwedOn(t.table, board, pack, turn, { held: heldOf })).toBe(oldOld.strategyTokensOwed(e, { held: heldOf }, t.g, before, before, pack));
    }
    expect(read.strategyTokensOwedOn(t.table, board, pack, turn, { free: true })).toBe(oldOld.strategyTokensOwed(e, { free: true }, t.g, before, before, pack));
    expect(read.costsTokenOn(t.table, turn, { held })).toBe(old.costsStrategyToken(e, { held }));
    expect(read.primaryForTokenOf(turn, held)).toBe(old.primaryForToken(e, held));
    expect(read.freeTokensOn(t.table, board, turn)).toBe(old.freeTokens(e, ['pok'], before));
    expect(read.researchTokensGivenOn(t.table, board, pack, turn.player, e.effects?.researched)).toBe(researchTokensGiven(pack, t.g, before, before, e.effects?.researched));
    expect(read.researchLimitOn(t.table, board, pack, turn)).toBe(old.researchLimit(e, before.holdings, { pack, faction }));
  });

  test('what a card bought stands where the replay places it', () => {
    const { e, turn, board, before } = t.at(t.entries[4]);
    expect(read.purchasesOn(t.table, board, pack, turn, 'B')).toEqual(placesOf(t.g, before, 'B', e.effects?.production?.units ?? {}, pack, e.effects?.production?.ground));
    expect(read.purchasesOn(t.table, board, pack, turn, 'A')).toEqual(placesOf(t.g, before, 'A', {}, pack, undefined));
  });
});

describe.each(['sol', 'arborec'])('the edits of a card turn, %s', faction => {
  const t = build(faction, BODIES);
  const patches: Record<string, unknown>[] = [
    { card: CARD.technology }, { card: CARD.trade }, { type: 'secondary' }, { type: 'strategic', forToken: true },
    { effects: { researched: ['neural-motivator', 'antimass-deflectors', 'sarween-tools'] } }, { effects: { tokens: { tactic: 3 } } },
    { effects: { production: { systemId: 'B', units: { cruiser: 2 } } } },
  ];
  const kernelPatch = (p: Record<string, unknown>): now.CardPatch => {
    const { type, ...rest } = p;
    return { ...rest, ...(type ? { side: type === 'strategic' ? 'primary' : 'secondary' } : {}) } as now.CardPatch;
  };

  test.each(INDEXES)('a change of the card reprices as cardChange does, entry %i', i => {
    const { e, turn, board, before } = t.at(t.entries[i]);
    for (const manual of [false, true]) {
      for (const patch of patches) {
        const expected = oldOld.cardChange(e, patch as oldOld.CardPatch, before, faction, pack, manual, t.g);
        sameEntry(t.table, now.withCardChange(t.table, board, pack, turn, kernelPatch(patch), manual), e, expected as never);
      }
    }
  });

  test.each(INDEXES)('a fresh play, a system, the shop and the tokens, entry %i', i => {
    const { e, turn } = t.at(t.entries[i]);
    for (const patch of [{ card: CARD.warfare, type: 'strategic' }, { type: 'secondary' }, { card: CARD.leadership }]) {
      const { acts, ...rest } = oldOld.freshPlay(patch as oldOld.CardPatch) as oldOld.CardPatch & { acts?: unknown };
      void acts;
      const next = now.withFreshPlay(turn, kernelPatch(patch));
      sameEntry(t.table, next, e, rest as never);
      if (patch.type === 'secondary') expect(next.acts).toEqual([]);
    }
    sameEntry(t.table, now.withChosenSystem(t.table, turn, 'C'), e, { effects: old.withSystem(e, 'C', ['pok']) } as never);
    sameEntry(t.table, now.withCardProduction(turn, 'B', 'infantry', pb, 1), e, { effects: old.withProduction(e.effects ?? {}, 'B', 'infantry', pb, 1) } as never);
    sameEntry(t.table, now.withCardProduction(turn, 'B', 'cruiser', null, -1), e, { effects: old.withProduction(e.effects ?? {}, 'B', 'cruiser', null, -1) } as never);
    sameEntry(t.table, now.withCardStructure(turn, 'spacedock', pb, 1), e, { effects: old.withStructure(e.effects ?? {}, 'spacedock', pb, 1) } as never);
    const tokens = { tactic: 2, fleet: 2 };
    sameEntry(t.table, now.withTokens(turn, tokens, true), e, { effects: old.withLeadershipTokens(e.effects ?? {}, tokens, e.type === 'strategic') } as never);
    sameEntry(t.table, now.withTokens(turn, tokens, false), e, { effects: { ...e.effects, tokens } } as never);
  });

  test('what the round decides: how a card starts and the flags follow its cards', () => {
    const r = t.g.plans[0].rounds[0];
    for (const i of [0, 1, 2, 3, 6]) {
      const { e, turn } = t.at(t.entries[i]);
      for (const card of [CARD.leadership, CARD.technology, CARD.warfare, CARD.trade]) {
        expect(now.startsAsPrimaryOn(t.round, t.table.viewer, card, turn)).toBe(oldOld.startsAsPrimary(r, 3, card, e));
        for (const primary of [true, false]) {
          for (const mine of [true, false]) {
            const was = oldOld.playOf(r, 3, card, primary, mine);
            expect(now.playOfOn(t.round, card, primary, mine)).toEqual({ side: was.type === 'strategic' ? 'primary' : 'secondary', forToken: was.forToken });
          }
        }
      }
    }
    const synced = now.withForTokenOfRound(t.round, t.table.viewer);
    const oldSynced = oldOld.withForTokenOfRound(r, 3);
    expect(synced.turns.map(turn => (turn.action.kind === 'strategic' ? turn.action.forToken : undefined)))
      .toEqual(oldSynced.entries.map(x => (x.type === 'strategic' ? x.forToken : undefined)));
    expect(now.withForTokenOfRound(synced, t.table.viewer)).toBe(synced);
  });
});

test('a turn that plays no card is returned as it is', () => {
  const t = build('sol', [{ type: 'pass' }]);
  const turn = turnOf(t.table, t.entries[0], pack);
  expect(now.withCard(turn, { card: 1 })).toBe(turn);
  expect(now.onEffects(turn, e => ({ ...e, tokens: { tactic: 1 } }))).toBe(turn);
});
