import { describe, expect, test } from 'vitest';
import { primary, rulesGame, rulesPack, tactical, TARGET, NEAR } from '../domain/rules/kit';
import type { Entry } from '../testing/old/domain/types';
import { tacticalEntries, tacticalNumbers, turnsOf } from '../testing/projection';
import { statusOf, turnNumbers } from '../game/numbering';

const te = rulesPack(undefined, ['pok', 'te']);
const move = { moves: [{ from: NEAR, units: { cruiser: 1 } }] };
const RIVALS = [{ id: 'hacan1', faction: 'hacan', vp: 0, seat: 2, color: 2 }, { id: 'muaat1', faction: 'muaat', vp: 0, seat: 3, color: 3 }];
const numbersOf = (entries: Entry[]) => {
  const game = rulesGame({ entries, game: { opponents: RIVALS } });
  return turnNumbers(turnsOf(game, game.plans[0].rounds[0], te));
};
const with_ = (e: Entry, extra: Partial<Entry>): Entry => ({ ...e, ...extra }) as Entry;

describe('the numbers and statuses of the turns of a round (the one count: the screens ask these)', () => {
  test('numbering counts tactical actions only, in the order of the plan; a cancelled one keeps no number', () => {
    const [a, b, c, d] = [tactical(TARGET, move), tactical(TARGET, move), tactical(TARGET, move), tactical(TARGET, move)];
    const entries = [a, { id: 'p', status: 'planned', phase: 'action', type: 'pass' } as Entry, with_(b, { status: 'cancelled' }), with_(c, { status: 'done' }), d];
    expect(numbersOf(entries)).toEqual({ [a.id]: 1, [c.id]: 2, [d.id]: 3 });
    expect(numbersOf([])).toEqual({});
  });

  test('each player counts their own turns: the first action of everyone is 1, wherever it stands in the plan', () => {
    const own = (owner?: string, status?: Entry['status']): Entry => with_(tactical(TARGET, move), { ...(owner ? { owner } : {}), ...(status ? { status } : {}) });
    const [x, y] = RIVALS.map(o => o.id);
    const [a, b, c, d, e, f, g] = [own(), own(x), own(y), own(x), own(), own(x, 'cancelled'), own(x)];
    expect(numbersOf([a, b, c, d, e, f, g])).toEqual({ [a.id]: 1, [b.id]: 1, [c.id]: 1, [d.id]: 2, [e.id]: 2, [g.id]: 3 });
  });

  // The free action is taken right after its card, wherever its entry is stored: it is counted at the card's place (LRR 40, Warfare).
  test("Warfare's free tactical action is numbered at the place of its card, not where its entry is stored", () => {
    const card = primary(6, {}, {});
    const free = tactical(TARGET, move, { fromCard: card.id });
    const own = tactical(TARGET, move);
    expect(numbersOf([card, own, free])).toEqual({ [free.id]: 1, [own.id]: 2 });
    expect(numbersOf([own, free, card])).toEqual({ [own.id]: 1, [free.id]: 2 });
  });

  test('a tactical action taken from a strategy card has the status of its card: the card done is its arrow done', () => {
    const card = with_(primary(6, {}, {}), { status: 'done' });
    const free = tactical(TARGET, move, { fromCard: card.id });
    const own = tactical(TARGET, move);
    const game = rulesGame({ entries: [card, free, own] });
    const round = game.plans[0].rounds[0];
    expect(tacticalEntries(game, round, te).map(e => [e.id, e.status])).toEqual([[free.id, 'done'], [own.id, 'planned']]);
    expect(statusOf(turnsOf(game, round, te), free.id)).toBe('done');
    const cancelled = rulesGame({ entries: [with_(card, { status: 'cancelled' }), free] });
    expect(tacticalEntries(cancelled, cancelled.plans[0].rounds[0], te).map(e => e.status)).toEqual(['cancelled']);
    // An action whose card is gone keeps its own status.
    const alone = rulesGame({ entries: [free] });
    expect(tacticalEntries(alone, alone.plans[0].rounds[0], te).map(e => e.status)).toEqual(['planned']);
    expect(tacticalNumbers(alone, alone.plans[0].rounds[0], te)).toEqual({ [free.id]: 1 });
  });
});
