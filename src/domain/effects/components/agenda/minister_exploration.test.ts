import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './minister_exploration';

/** The law comes into play in the strategy phase; `owner` is the player elected, me unless an opponent is named. */
const law = (owner?: string): Entry => ({ ...adjust({}, 'strategy'), gains: [id], ...(owner ? { owner } : {}) });
const RIVAL = { opponents: [{ id: 'x', faction: 'letnev', vp: 0, seat: 2, color: 2 }] };

/** A carrier with two infantry flies from the near system into the target and lands on `planets`. */
const invade = (...planets: string[]) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: planets.length } }],
  landings: planets.map(planetId => ({ planetId, units: { infantry: 1 } })),
});
const table = (entries: Entry[], game: Parameters<typeof bench>[0]['game'] = {}) =>
  bench({ faction: 'sol', units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries, game });

describe('agenda:minister_exploration Minister of Exploration', () => {
  // "When the owner of this card gains control of a planet, they gain 1 trade good."
  // Checks: the owner takes Target One and ends the plan with 1 trade good.
  // Why the check is redundant here: no check is lifted; the law adds to the count of trade goods, which the plan
  // tracks, at the moment control is gained (49.6 for an invasion).
  test.fails('agenda:minister_exploration gives 1 trade good for a planet taken', () => {
    const minister = table([law(), invade('t1')]);
    quote(minister.pack, id, 'When the owner of this card gains control of a planet, they gain 1 trade good.');
    expect(endOf(minister).control.t1).toBe('me');
    expect(endOf(minister).tradeGoods).toBe(1);
  });

  // Checks: two planets taken in one action give 2.
  // Why: the law speaks of each planet ("a planet"), once per control gained.
  test.fails('agenda:minister_exploration gives 1 trade good for each planet taken', () => {
    expect(endOf(table([law(), invade('t1', 't2')])).tradeGoods).toBe(2);
  });

  // Checks: landing again on a planet already controlled gives nothing more: 1 for two landings on t1.
  // Why the check is NOT redundant here: control is gained once; a planet already the owner's is not gained again.
  test.fails('agenda:minister_exploration a planet already controlled gives nothing more', () => {
    const first = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    const second = tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    const minister = table([law(), first, second]);
    expect(endOf(minister).tradeGoods).toBe(1);
  });

  // LRR 25 / 49.6: gaining control of a planet gives no trade goods by itself.
  // Checks: without the law the planet is taken and no trade good comes.
  // Why the check is NOT redundant here: the law is not in play.
  test('agenda:minister_exploration not in play: a planet taken gives no trade good', () => {
    const plain = table([invade('t1')]);
    expect(endOf(plain).control.t1).toBe('me');
    expect(endOf(plain).tradeGoods).toBe(0);
  });

  // "The elected player gains this card."
  // Checks: the law elected another player: my planet taken gives me nothing.
  // Why the check is NOT redundant here: the law is its owner's alone.
  test('agenda:minister_exploration owned by another player gives me nothing', () => {
    expect(endOf(table([law('x'), invade('t1')], RIVAL)).tradeGoods).toBe(0);
  });

  test.fails('agenda:minister_exploration is a passive effect', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('passive');
  });
});
