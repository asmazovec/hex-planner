/**
 * The activation of a system as the components see it (LRR 89.1): `onActivate` is asked of every player's components in
 * force, `playAt` runs the play of a component a tactical action names in the middle of the action. Tried with
 * throwaway effects in the registry of a bench's own pack.
 */
import { describe, expect, test } from 'vitest';
import { bench, componentAction, endOf, HOME, NEAR, TARGET, tactical, using, warningsOf, type Bench } from '../effects/components/kit';
import { gain, tokens } from '../../game/abilities/emit';
import type { Play } from '../../game/abilities/types';
import { effectsOf } from '../effects/registry';
import type { ComponentEffect } from '../effects/types';
import type { Entry } from '../types';
import '../effects/points/movement';

const TECH = 'technology:gd';
const CARD = 'actionCard:rally';
const give = (table: Bench, id: string, effect: Partial<ComponentEffect>): void => {
  (effectsOf(table.pack) as Map<string, ComponentEffect>).set(id, { tier: 'passive', rule: 'test', holder: 'anyone', ...effect });
};
const O1 = { id: 'o1', faction: 'naalu', vp: 0, seat: 2, color: 2 };
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', '3,0': 'r-empty', '4,0': 'r-empty' };

describe('onActivate', () => {
  test('89.1 a component of mine in force is asked when I activate a system, after the token is placed', () => {
    const seen: unknown[] = [];
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const table = bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, start: { technologies: [TECH] }, entries: [move], game: { map: MAP } });
    give(table, TECH, { on: { onActivate: (ctx, a) => { seen.push({ id: ctx.id, owner: ctx.key(ctx.holder), activator: ctx.key(a.activator), system: a.systemId, token: ctx.board.systems[a.systemId]?.tokens.includes(a.activator) }); } } });
    warningsOf(table, move);
    expect(seen).toEqual([{ id: TECH, owner: 'me', activator: 'me', system: TARGET, token: true }]);
  });

  test('a component of another player is asked as well, and says whose activation it is', () => {
    const seen: unknown[] = [];
    const move = tactical(TARGET, { moves: [] });
    const table = bench({ faction: 'sol', entries: [move], game: { map: MAP, opponents: [O1], start: { me: {}, opponents: { o1: { technologies: [TECH] } } } } });
    give(table, TECH, { on: { onActivate: (ctx, a) => { seen.push({ owner: ctx.key(ctx.holder), activator: ctx.key(a.activator), faction: ctx.my.faction, mine: ctx.holder === a.activator }); } } });
    warningsOf(table, move);
    expect(seen).toEqual([{ owner: 'o1', activator: 'me', faction: 'naalu', mine: false }]);
  });

  test('an opponent\'s activation asks my component too, with my game', () => {
    const seen: unknown[] = [];
    const theirs: Entry = tactical(TARGET, { moves: [] }, { owner: 'o1' });
    const table = bench({ faction: 'sol', entries: [theirs], start: { technologies: [TECH] }, game: { map: MAP, opponents: [O1] } });
    give(table, TECH, { on: { onActivate: (ctx, a) => { seen.push({ owner: ctx.key(ctx.holder), activator: ctx.key(a.activator), faction: ctx.my.faction }); } } });
    warningsOf(table, theirs);
    expect(seen).toEqual([{ owner: 'me', activator: 'o1', faction: 'sol' }]);
  });

  test('a component can change the board of the activator or of its owner, and a warning it adds is the entry\'s', () => {
    const move = tactical(TARGET, { moves: [] });
    const table = bench({ faction: 'sol', start: { technologies: [TECH] }, entries: [move], game: { map: MAP } });
    give(table, TECH, { on: { onActivate: (ctx, a) => { ctx.warn({ code: 'fleetPool', params: { systemId: a.systemId, ships: 9, fleet: 3 } } as never); return [gain.tradeGoods(ctx.holder, 2)]; } } });
    expect(warningsOf(table, move).map(w => w.code)).toContain('fleetPool');
    expect(endOf(table).tradeGoods).toBe(2);
  });
});

describe('playAt', () => {
  const table = (at: 'activation' | 'combat' | undefined, play: Play, extra: { losses?: Record<string, number> } = {}) => {
    const base = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }], ...extra });
    const move = using(base, CARD);
    const t = bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, start: { hand: [CARD] }, entries: [move], game: { map: MAP } });
    give(t, CARD, { tier: 'play', nativePlay: play, ...(at ? { playAt: at } : {}) });
    return { t, move };
  };

  test('a play named by a tactical action runs after the action by default', () => {
    const order: string[] = [];
    const { t, move } = table(undefined, ctx => { order.push(`play:${ctx.my.unitsIn(TARGET).cruiser ?? 0}`); });
    warningsOf(t, move);
    expect(order).toEqual(['play:1']);
  });

  test('playAt activation runs once, after the token and before the move, so what it places can move', () => {
    const calls: string[] = [];
    const { t, move } = table('activation', ctx => {
      calls.push(`${ctx.board.systems[TARGET]?.tokens.includes(ctx.holder)}:${ctx.my.unitsIn(HOME).cruiser ?? 0}`);
      return [tokens(ctx.holder, { fleet: 2 })];
    });
    warningsOf(t, move);
    expect(calls).toEqual(['true:1']);
    expect(endOf(t).fleet).toBe(5);
  });

  test('playAt combat runs once, after the losses and before the landing', () => {
    const calls: number[] = [];
    const { t, move } = table('combat', ctx => { calls.push(ctx.my.unitsIn(TARGET).cruiser ?? 0); }, { losses: { cruiser: 1 } });
    warningsOf(t, move);
    expect(calls).toEqual([0]);
  });

  test('a play at a step does not run again for a component action that is not a tactical one', () => {
    const calls: number[] = [];
    const entry = componentAction(CARD);
    const t = bench({ faction: 'sol', start: { hand: [CARD] }, entries: [entry], game: { map: MAP } });
    give(t, CARD, { tier: 'play', nativePlay: () => { calls.push(1); }, playAt: 'activation' });
    warningsOf(t, entry);
    expect(calls).toEqual([1]);
  });
});
