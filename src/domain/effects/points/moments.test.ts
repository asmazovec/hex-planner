/**
 * The moments of a round (points/moments.ts), tested with throwaway effects (`withEffect`), never a component's file:
 * each hook is asked once, at its moment, for the player whose moment it is, and only while the component is in force.
 * docs/phase4/infra/moments.md names them all.
 */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { adjust, forecast, mutable, primary, rulesGame, rulesPack, secondary, statusTokens, tactical, HOME, NEAR, TARGET } from '../../rules/kit';
import type { Entry } from '../../types';
import type { ComponentEffect } from '../types';
import { spendStrategyTokens } from '../../replay/status';
import { withEffect } from './status.kit';
import './moments';

const TECH = 'technology:hm';
const held = { game: { start: { me: { technologies: [TECH] }, opponents: {} } } };
const hooked = (effect: Partial<ComponentEffect>): ComponentEffect => ({ tier: 'passive', rule: TECH, ...effect });
const run = (effect: Partial<ComponentEffect>, rounds: Entry[][], extra: object = held) => {
  const pack = rulesPack();
  withEffect(pack, TECH, hooked(effect));
  return forecast(rulesGame({ rounds, ...extra }), pack);
};

describe('onRoundStart, onStatusStart, onStatusEnd: once a round', () => {
  test('onRoundStart runs once at the start of each round the replay reaches, before its first entry', () => {
    const seen: number[] = [];
    const { state } = run({ onRoundStart: ({ state: mine }) => { seen.push(mine.tradeGoods); mine.tradeGoods += 1; } }, [[adjust({}), adjust({})], [adjust({})]]);
    expect(seen).toEqual([0, 1]);
    expect(state.tradeGoods).toBe(2);
  });

  test('onStatusStart runs once before the first status entry, whatever the number of entries', () => {
    const { state } = run({ onStatusStart: ({ state: mine }) => { mine.tradeGoods += 1; } }, [[statusTokens(1, 1, 0), statusTokens(0, 0, 0)]]);
    expect(state.tradeGoods).toBe(1);
  });

  test('onStatusEnd runs once, after the status tokens are gained, and the hook\'s warnings go to the entry', () => {
    let fleetThen = -1;
    const status = statusTokens(0, 2, 0);
    const { state, warnings } = run({
      onStatusEnd: ({ state: mine, warnings: made }) => { fleetThen = mine.fleet; mine.fleet -= 1; made.push({ code: 'poolNegative', params: { pool: 'fleet', have: -1 } } as never); },
    }, [[status, statusTokens(0, 0, 0)]]);
    expect(fleetThen).toBe(5);
    expect(state.fleet).toBe(4);
    expect(warnings[status.id].some(w => w.code === 'poolNegative')).toBe(true);
  });

  test('a round with no status entry does not reach the status moments', () => {
    const { state } = run({ onStatusStart: ({ state: mine }) => { mine.tradeGoods += 1; }, onStatusEnd: ({ state: mine }) => { mine.tradeGoods += 10; } }, [[adjust({})]]);
    expect(state.tradeGoods).toBe(0);
  });

  test('a component not in force is not asked', () => {
    const { state } = run({ onRoundStart: ({ state: mine }) => { mine.tradeGoods += 1; } }, [[adjust({})]], {});
    expect(state.tradeGoods).toBe(0);
  });
});

describe('onTurnStart', () => {
  test('runs before each turn of the action phase and not before a status entry', () => {
    const { state } = run({ onTurnStart: ({ state: mine }) => { mine.tradeGoods += 1; } }, [[tactical(NEAR), tactical(TARGET), statusTokens(0, 0, 0)]]);
    expect(state.tradeGoods).toBe(2);
  });
});

describe('onTokenSpent', () => {
  test('runs after a strategy card spends a token, with the count and the side of the card, and not when none is spent', () => {
    const seen: [number, boolean][] = [];
    const { state } = run({ onTokenSpent: ({ count, secondary: side }) => { seen.push([count, side]); } }, [[secondary(CARD.warfare), secondary(CARD.leadership), primary(CARD.warfare)]]);
    expect(seen).toEqual([[1, true]]);
    expect(state.strategy).toBe(1);
  });

  test('spendStrategyTokens, the helper of a component that costs tokens, asks it too', () => {
    const pack = rulesPack();
    const seen: number[] = [];
    withEffect(pack, TECH, hooked({ onTokenSpent: ({ count }) => { seen.push(count); } }));
    const turn = { game: rulesGame({ ...held }), state: mutable(forecast(rulesGame({ ...held }), pack).state), pack, warnings: [], id: 'x' };
    spendStrategyTokens({ ...turn, shared: turn.state } as never, 1);
    expect(seen).toEqual([1]);
  });
});

describe('onProduced and onDestroyed: the tactical action', () => {
  test('onProduced runs after a use of PRODUCTION with the units made', () => {
    const seen: unknown[] = [];
    const move = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: [], tradeGoods: 0 } });
    run({ onProduced: ({ units, systemId }) => { seen.push([units, systemId]); } }, [[move]], { game: { ...held.game, docks: ['h1'] } });
    expect(seen).toEqual([[{ cruiser: 1 }, HOME]]);
  });

  test('onDestroyed runs with the units the action lost, in space and on planets', () => {
    const seen: unknown[] = [];
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 2 } }], losses: { carrier: 1 }, groundLosses: { t1: { infantry: 1 } } });
    run({ onDestroyed: ({ losses }) => { seen.push(losses); } }, [[move]], { ...held, units: { [NEAR]: { carrier: 1, infantry: 2 } } });
    expect(seen).toEqual([[{ unit: 'carrier', count: 1, systemId: TARGET }, { unit: 'infantry', count: 1, planetId: 't1' }]]);
  });
});

describe('fleetPoolMax: the most tokens a fleet pool holds', () => {
  const law = (limit: number): Partial<ComponentEffect> => ({ modify: { fleetPoolMax: value => Math.min(value, limit) } });
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
