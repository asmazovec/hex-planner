/**
 * The moments of a round (points/moments.ts), tested with throwaway effects (`withEffect`), never a component's file:
 * each hook is asked once, at its moment, for the player whose moment it is, and only while the component is in force.
 * docs/phase4/infra/moments.md names them all.
 */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { adjust, forecast, primary, rulesGame, rulesPack, secondary, statusTokens, tactical, HOME, NEAR, TARGET } from '../../rules/kit';
import type { Entry } from '../../../testing/old/domain/types';
import type { Ability } from '../types';
import { spendStrategyBy } from '../helpers/cardPlay';
import { gain } from '../../../game/abilities/emit';
import type { Hooks } from '../../../game/abilities/types';
import { withEffect } from './status.kit';
import './moments';

const TECH = 'technology:hm';
const held = { game: { start: { me: { technologies: [TECH] }, opponents: {} } } };
const hooked = (effect: Partial<Ability>): Ability => ({ tier: 'passive', rule: TECH, holder: 'anyone', ...effect });
/** A throwaway component whose hooks are written for the kernel (`on`); the old-shape point of the count (`modify`) goes in as it is. */
const native = (on: Hooks): Partial<Ability> => ({ on });
const run = (effect: Partial<Ability>, rounds: Entry[][], extra: object = held) => {
  const pack = rulesPack();
  withEffect(pack, TECH, hooked(effect));
  return forecast(rulesGame({ rounds, ...extra }), pack);
};

describe('onRoundStart, onStatusStart, onStatusEnd: once a round', () => {
  test('onRoundStart runs once at the start of each round the replay reaches, before its first entry', () => {
    const seen: number[] = [];
    const { state } = run(native({ onRoundStart: ctx => { seen.push(ctx.my.tradeGoods); return [gain.tradeGoods(ctx.holder, 1)]; } }), [[adjust({}), adjust({})], [adjust({})]]);
    expect(seen).toEqual([0, 1]);
    expect(state.tradeGoods).toBe(2);
  });

  test('onStatusStart runs once before the first status entry, whatever the number of entries', () => {
    const { state } = run(native({ onStatusStart: ctx => [gain.tradeGoods(ctx.holder, 1)] }), [[statusTokens(1, 1, 0), statusTokens(0, 0, 0)]]);
    expect(state.tradeGoods).toBe(1);
  });

  test('onStatusEnd runs once, after the status tokens are gained, and the hook\'s warnings go to the entry', () => {
    let fleetThen = -1;
    const status = statusTokens(0, 2, 0);
    const { state, warnings } = run(native({
      onStatusEnd: ctx => { fleetThen = ctx.my.pools.fleet; ctx.warn({ code: 'poolNegative', params: { pool: 'fleet', have: -1 } } as never); return [gain.tokens(ctx.holder, { fleet: -1 })]; },
    }), [[status, statusTokens(0, 0, 0)]]);
    expect(fleetThen).toBe(5);
    expect(state.fleet).toBe(4);
    expect(warnings[status.id].some(w => w.code === 'poolNegative')).toBe(true);
  });

  test('a round with no status entry does not reach the status moments', () => {
    const { state } = run(native({ onStatusStart: ctx => [gain.tradeGoods(ctx.holder, 1)], onStatusEnd: ctx => [gain.tradeGoods(ctx.holder, 10)] }), [[adjust({})]]);
    expect(state.tradeGoods).toBe(0);
  });

  test('a component not in force is not asked', () => {
    const { state } = run(native({ onRoundStart: ctx => [gain.tradeGoods(ctx.holder, 1)] }), [[adjust({})]], {});
    expect(state.tradeGoods).toBe(0);
  });
});

describe('onTurnStart', () => {
  test('runs before each turn of the action phase and not before a status entry', () => {
    const { state } = run(native({ onTurnStart: ctx => [gain.tradeGoods(ctx.holder, 1)] }), [[tactical(NEAR), tactical(TARGET), statusTokens(0, 0, 0)]]);
    expect(state.tradeGoods).toBe(2);
  });
});

describe('onTokenSpent', () => {
  test('runs after a strategy card spends a token, with the count and the side of the card, and not when none is spent', () => {
    const seen: [number, boolean][] = [];
    const { state } = run(native({ onTokenSpent: (_, { count, secondary: side }) => { seen.push([count, side]); } }), [[secondary(CARD.warfare), secondary(CARD.leadership), primary(CARD.warfare)]]);
    expect(seen).toEqual([[1, true]]);
    expect(state.strategy).toBe(1);
  });

  test('a play that spends strategy tokens (spendStrategyBy) asks it too', () => {
    const pack = rulesPack();
    const seen: number[] = [];
    withEffect(pack, TECH, hooked({ on: { onTokenSpent: (_, { count }) => { seen.push(count); } } }));
    withEffect(pack, 'actionCard:bribery', { tier: 'play', rule: 'x', play: ctx => spendStrategyBy(ctx) });
    forecast(rulesGame({ entries: [{ ...adjust({}), uses: ['actionCard:bribery'] } as Entry], ...held }), pack);
    expect(seen).toEqual([1]);
  });
});

describe('onProduced and onDestroyed: the tactical action', () => {
  test('onProduced runs after a use of PRODUCTION with the units made', () => {
    const seen: unknown[] = [];
    const move = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: [], tradeGoods: 0 } });
    run(native({ onProduced: (_, { units, systemId }) => { seen.push([units, systemId]); } }), [[move]], { game: { ...held.game, docks: ['h1'] } });
    expect(seen).toEqual([[{ cruiser: 1 }, HOME]]);
  });

  test('onDestroyed runs with the units the action lost, in space and on planets', () => {
    const seen: unknown[] = [];
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 2 } }], losses: { carrier: 1 }, groundLosses: { t1: { infantry: 1 } } });
    run(native({ onDestroyed: (_, { losses }) => { seen.push(losses); } }), [[move]], { ...held, units: { [NEAR]: { carrier: 1, infantry: 2 } } });
    expect(seen).toEqual([[{ unit: 'carrier', count: 1, systemId: TARGET }, { unit: 'infantry', count: 1, planetId: 't1' }]]);
  });
});

describe('fleetPoolMax: the most tokens a fleet pool holds', () => {
  const law = (limit: number): Partial<Ability> => ({ modify: { fleetPoolMax: value => Math.min(value, limit) } });
  test('a status entry that brings the fleet pool over the point is warned of with fleetPoolTokens; within it, nothing', () => {
    const over = statusTokens(0, 2, 0);
    expect(run(law(4), [[over]]).warnings[over.id].find(w => w.code === 'fleetPoolTokens')?.params).toEqual({ fleet: 5, limit: 4 });
    const within = statusTokens(1, 1, 0);
    expect(run(law(4), [[within]]).warnings[within.id].map(w => w.code)).not.toContain('fleetPoolTokens');
  });

  test('without a point nothing limits the pool', () => {
    const over = statusTokens(0, 2, 0);
    expect(run({}, [[over]]).warnings[over.id].map(w => w.code)).not.toContain('fleetPoolTokens');
  });
});
