/** LRR 37 Fleet Pool. Source: tirules2 rules-reference/fleet-pool.md. Base pack: a carrier I has capacity 4, a fighter II moves by itself. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { adjust, codesOf, forecast, HOME, NEAR, primary, rulesGame, rulesPack, secondary, tactical, TARGET } from '../kit';

const pack = rulesPack();
const fighterTwo = { upgrades: { me: ['fighter' as const], opponents: {} } };

describe('LRR 37 Fleet Pool', () => {
  test('37.1: non-fighter ships in a system beyond the fleet pool are warned about', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { destroyer: 4 } }] });
    const game = rulesGame({ units: { [HOME]: { destroyer: 4 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('fleetPool');
  });

  test('37.1 / 76.2: as many ships as tokens in the fleet pool is allowed', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { destroyer: 3 } }] });
    const game = rulesGame({ units: { [HOME]: { destroyer: 3 } }, entries: [move] });
    expect(codesOf(game, pack, move)).not.toContain('fleetPool');
  });

  test('37.1: the fleet pool grows with tokens placed in it', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { destroyer: 4 } }] });
    const game = rulesGame({ units: { [HOME]: { destroyer: 4 } }, entries: [adjust({ fleet: 1 }, 'strategy'), move] });
    expect(codesOf(game, pack, move)).not.toContain('fleetPool');
  });

  test('37.1: ships moved in join the ships already in the system for the count', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { destroyer: 2 } }] });
    const game = rulesGame({ units: { [NEAR]: { destroyer: 2 }, [TARGET]: { cruiser: 2 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('fleetPool');
  });

  test('37.1.1: ground forces in space and on planets do not count against the fleet pool', () => {
    const move = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, destroyer: 2, infantry: 4 } }],
      landings: [{ planetId: 't1', units: { infantry: 2 } }],
    });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, destroyer: 2, infantry: 4 } }, entries: [move] });
    expect(codesOf(game, pack, move)).not.toContain('fleetPool');
  });

  test('37.1.1: fighter II carried within capacity do not count against the fleet pool', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1, destroyer: 2, fighter: 4 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1, destroyer: 2, fighter: 4 } }, entries: [move], game: fighterTwo });
    expect(codesOf(game, pack, move)).not.toContain('fleetPool');
  });

  test('37.1.2 / 37 note 3: ships passing through a system at its limit do not count there', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 }, [NEAR]: { destroyer: 3 } }, entries: [move] });
    expect(codesOf(game, pack, move)).not.toContain('fleetPool');
  });

  test.todo('37.2: fleet tokens lie ship side up — not modelled: physical tokens');

  test('37.3: lowering the fleet pool below the ships already standing in a system is warned about', () => {
    // Warfare before Thunder's Edge rearranges: a fleet token moves to the tactic pool, with the one token it gains.
    const play = primary(CARD.warfare, { tokens: { fleet: -1, tactic: 2 } });
    const game = rulesGame({ units: { [HOME]: { destroyer: 3 } }, entries: [play] });
    expect(forecast(game, pack).state.fleet).toBe(2);
    expect(codesOf(game, pack, play)).toContain('fleetPool');
  });

  test('37.3: producing a ship beyond the fleet pool is warned about', () => {
    const build = tactical(HOME, { production: { destroyer: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
    const game = rulesGame({ units: { [HOME]: { destroyer: 3 } }, entries: [build], game: { docks: ['h1'] } });
    expect(codesOf(game, pack, build)).toContain('fleetPool');
  });

  test('37.4: a tactical action spends a tactic token, never a fleet token', () => {
    const game = rulesGame({ entries: [tactical(NEAR)] });
    const { state } = forecast(game, pack);
    expect([state.tactic, state.fleet]).toEqual([2, 3]);
  });

  test('37.4: a secondary spends a strategy token, never a fleet token', () => {
    const { state } = forecast(rulesGame({ entries: [secondary(CARD.trade)] }), pack);
    expect([state.strategy, state.fleet]).toEqual([1, 3]);
  });

  test.todo('37 note 1: during combat fighters and ground forces ignore capacity and the pool until it ends — not modelled: combat steps are not planned');

  test('37 note 2: ships may move in beyond the limit: it is a warning, the move still happens', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { destroyer: 4 } }] });
    const { state } = forecast(rulesGame({ units: { [HOME]: { destroyer: 4 } }, entries: [move] }), pack);
    expect(state.systems[NEAR]).toEqual({ destroyer: 4 });
  });

  test('37 note 2.1: fighter II beyond the capacity count as ships against the fleet pool', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { destroyer: 2, fighter: 2 } }] });
    const game = rulesGame({ units: { [HOME]: { destroyer: 2, fighter: 2 } }, entries: [move], game: fighterTwo });
    expect(codesOf(game, pack, move)).toContain('fleetPool');
  });

  test('37 note 4: a ship lost on the way does not count toward the fleet pool of the destination', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { destroyer: 4 } }], losses: { destroyer: 1 } });
    const game = rulesGame({ units: { [HOME]: { destroyer: 4 } }, entries: [move] });
    expect(codesOf(game, pack, move)).not.toContain('fleetPool');
  });
});
