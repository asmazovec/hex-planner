/** LRR 89 Tactical Action. Source: tirules2 rules-reference/tactical-action.md. */
import { describe, expect, test } from 'vitest';
import { adjust, codesOf, forecast, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();

describe('LRR 89 Tactical Action', () => {
  test('89.1: the active player must activate a system that does not hold one of their tokens', () => {
    const second = tactical(TARGET);
    const game = rulesGame({ entries: [tactical(TARGET), second] });
    expect(codesOf(game, pack, second)).toContain('systemHasToken');
  });

  test('89.1.1: activating takes a token from the tactic pool, not from the fleet or strategy pool, and puts it in the system', () => {
    const { state } = forecast(rulesGame({ entries: [tactical(TARGET)] }), pack);
    expect([state.tactic, state.fleet, state.strategy]).toEqual([2, 3, 2]);
    expect(state.tokensOnMap).toEqual([TARGET]);
  });

  test('89.1.2: another player\'s token does not prevent activation', () => {
    const mine = tactical(TARGET);
    const game = rulesGame({
      entries: [tactical(TARGET, {}, { owner: 'o1' }), mine],
      game: { opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }] },
    });
    expect(codesOf(game, pack, mine)).not.toContain('systemHasToken');
  });

  test('89.2: ships cannot move out of a system holding the player\'s token', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 } }, entries: [tactical(NEAR), move] });
    expect(codesOf(game, pack, move)).toContain('sourceActivated');
  });

  test('89.2: a ship needs a move value large enough for the way', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }] });
    expect(codesOf(rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [move] }), pack, move)).toContain('speedShort');
  });

  test('89.2.1: ships with capacity carry ground forces and fighters, up to that capacity', () => {
    const fits = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2, fighter: 2 } }] });
    expect(codesOf(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2, fighter: 2 } }, entries: [fits] }), pack, fits)).toEqual([]);
    const over = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 5 } }] });
    expect(codesOf(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 5 } }, entries: [over] }), pack, over)).toContain('capacityGroup');
  });

  test('89.2.2: the player may move no ships at all', () => {
    const action = tactical(TARGET);
    const game = rulesGame({ entries: [action] });
    expect(codesOf(game, pack, action)).toEqual([]);
    expect(forecast(game, pack).state.tokensOnMap).toEqual([TARGET]);
  });

  test.todo('89.2.3: after the moves every player may fire Space Cannon in the active system — not modelled: Space Cannon is not resolved; losses are entered by hand');

  test('89.3: units lost in the space combat are gone before the invasion, so they cannot land', () => {
    const action = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
      losses: { infantry: 1 },
      landings: [{ planetId: 't1', units: { infantry: 2 } }],
    });
    expect(codesOf(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [action] }), pack, action)).toContain('landingOverLimit');
  });

  test('89.3 / 16.3.3: cargo beyond the capacity left after the space combat is removed before the invasion and cannot land', () => {
    // The carrier falls in the battle; the cruiser has no capacity, so the two infantry in space are removed at the end of combat.
    const action = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, cruiser: 1, infantry: 2 } }],
      losses: { carrier: 1 },
      landings: [{ planetId: 't1', units: { infantry: 2 } }],
    });
    const codes = codesOf(rulesGame({ units: { [NEAR]: { carrier: 1, cruiser: 1, infantry: 2 } }, entries: [action] }), pack, action);
    expect(codes.some(code => ['capacitySystem', 'landingOverLimit'].includes(code))).toBe(true);
  });

  test.todo('89.3.1: with no other player\'s ships the space combat is skipped — not modelled as a check: losses may also come from Space Cannon, so a loss without enemy ships is not wrong');

  test('89.4: ground forces land on planets of the active system and take control of them', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [action] }), pack);
    expect(state.control.t1).toBe('me');
    expect(state.ground.t1).toEqual({ infantry: 1 });
  });

  test('89.4: landing on a planet outside the active system is warned about', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 'h1', units: { infantry: 1 } }] });
    expect(codesOf(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [action] }), pack, action)).not.toEqual([]);
  });

  test('89.4: ground forces already on a planet of the active system cannot be used to invade a planet of another system', () => {
    // Infantry on h1 (home system) "lands" on t1 during an action at TARGET without being carried there.
    const action = tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    const game = rulesGame({ entries: [adjust({ ground: { h1: { infantry: 1 } } }, 'strategy'), action] });
    expect(codesOf(game, pack, action)).toContain('landingOverLimit');
  });

  test('89.5: what the active player produces is placed in the active system', () => {
    const action = tactical(HOME, { production: { cruiser: 1 } });
    const { state } = forecast(rulesGame({ entries: [action], game: { docks: ['h1'] } }), pack);
    expect(state.systems).toEqual({ [HOME]: { cruiser: 1 } });
  });

  test('89.5.1: production happens even without moving or landing', () => {
    const build = tactical(HOME, { production: { destroyer: 1 } });
    expect(forecast(rulesGame({ entries: [build], game: { docks: ['h1'] } }), pack).state.systems[HOME]).toEqual({ destroyer: 1 });
  });

  test('89 note 1: one action moves, lands and produces; no step excludes another', () => {
    const action = tactical(HOME, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
      landings: [{ planetId: 'h2', units: { infantry: 2 } }],
      production: { destroyer: 1 },
      payment: { planets: ['h1'], tradeGoods: 0 },
    });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [action], game: { docks: ['h1'] } });
    const { state } = forecast(game, pack);
    expect(state.systems[HOME]).toEqual({ carrier: 1, destroyer: 1 });
    expect(state.ground.h2).toEqual({ infantry: 2 });
    expect(codesOf(game, pack, action)).toEqual([]);
  });

  test.todo('89 note 2: end-of-action abilities come before end-of-turn ones — not modelled: timing of abilities is not tracked');
});
