/**
 * The shared infrastructure of the invasion subsystem (docs/phase4/infra/invasion.md), tested with throwaway effects:
 * the registry of the test's own pack is given a hook, so no component file is touched.
 */
import { describe, expect, test } from 'vitest';
import { effectsOf } from '../effects/registry';
import { place } from '../../game/abilities/emit';
import type { HookPayloads } from '../../game/abilities/types';
import type { Ability } from '../effects/types';
import { bench, endOf, expectStanding, NEAR, TARGET, adjust, tactical, using, warningsOf, type Bench } from '../effects/components/kit';
import type { AnyWarningCode } from '../types';
import type { Entry } from '../../testing/old/domain/types';
import type { Player } from '../players';
import { attachCard, exploreCondition, placeOnPlanet } from '../../testing/old/domain/replay/invasion';

const RIVAL: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const code = (name: string) => name as AnyWarningCode;

/** Gives the pack of a bench a throwaway effect for a component. */
const give = (table: Bench, id: string, effect: Ability): void => {
  (effectsOf(table.pack) as Map<string, Ability>).set(id, effect);
};

/** A carrier with two infantry from NEAR lands `planets` one infantry each. */
const invade = (planets: string[], extra: Partial<Entry> = {}) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: planets.length } }],
  landings: planets.map(planetId => ({ planetId, units: { infantry: 1 } })),
}, extra);

describe('onGainControl', () => {
  test('a passive hook runs once for each planet newly gained, with control already changed', () => {
    const seen: HookPayloads['onGainControl'][] = [];
    let exhausted: boolean | undefined;
    const move = invade(['t1', 't2']);
    const table = bench({ faction: 'saar', units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [move], game: { planetControl: { t2: 'me' } } });
    give(table, 'ability:scavenge', { tier: 'passive', rule: 'x', holder: 'anyone', on: { onGainControl: (ctx, got) => { seen.push(got); exhausted = ctx.board.planets.t1?.exhausted; } } });
    endOf(table);
    expect(seen.map(got => got.planetId)).toEqual(['t1']);
    expect(seen[0]).toEqual({ planetId: 't1', fromPlayer: false, explores: true, lost: [] });
    expect(exhausted).toBe(true);
  });

  test('a hook of a component the player does not have does not run', () => {
    let ran = 0;
    const table = bench({ faction: 'sol', units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invade(['t1'])] });
    give(table, 'ability:scavenge', { tier: 'passive', rule: 'x', holder: 'anyone', on: { onGainControl: () => { ran += 1; } } });
    endOf(table);
    expect(ran).toBe(0);
  });

  test('the hook of a play effect runs when the entry names it in uses, and not otherwise', () => {
    const ran: string[] = [];
    const id = 'exploration:mo1';
    const play: Ability = { tier: 'play', rule: 'x', holder: 'anyone', on: { onGainControl: (ctx, got) => { ran.push(got.planetId); return [place.units(ctx.holder, { planet: got.planetId }, { infantry: 1 })]; } } };
    const used = bench({ faction: 'sol', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [using(invade(['t1']), id)] });
    give(used, id, play);
    expect(endOf(used).ground.t1).toEqual({ infantry: 2 });
    const plain = bench({ faction: 'sol', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invade(['t1'])] });
    give(plain, id, play);
    expect(endOf(plain).ground.t1).toEqual({ infantry: 1 });
    expect(ran).toEqual(['t1']);
  });

  test('a card in the gains of the entry hooks too, and the hook sees the structures of the previous holder', () => {
    const lost: HookPayloads['onGainControl']['lost'][] = [];
    const id = 'actionCard:infiltrate';
    const table = bench({
      faction: 'sol', start: { hand: [id] }, units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [using(invade(['t1']), id)],
      game: { opponents: [RIVAL], docks: ['t1'], pds: { t1: 1 }, planetControl: { t1: 'enemy' }, planetOwner: { t1: 'o1' } },
    });
    give(table, id, { tier: 'play', rule: 'x', holder: 'anyone', on: { onGainControl: (_ctx, got) => { lost.push(got.lost); expect(got.fromPlayer).toBe(true); expect(got.explores).toBe(false); } } });
    endOf(table);
    expect(lost).toEqual([[{ kind: 'pds', owner: 'o1', count: 1 }, { kind: 'spacedock', owner: 'o1', count: 1 }]]);
  });
});

describe('tradeGoodsOnControl', () => {
  test('a point asked at each planet gained adds its value to the trade goods', () => {
    const table = bench({ faction: 'saar', units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invade(['t1', 't2'])], game: { planetControl: { t2: 'me' } } });
    give(table, 'ability:scavenge', { tier: 'passive', rule: 'x', modify: { tradeGoodsOnControl: (value, ctx) => (ctx.planetId === 't1' ? value + 1 : value) } });
    expect(endOf(table).tradeGoods).toBe(1);
  });
});

describe('landing from a planet', () => {
  const commit = (from: string, units = { infantry: 1 }) => tactical(TARGET, { landings: [{ planetId: 't1', units, from }] });
  const table = (move: Entry) => bench({ faction: 'sol', entries: [adjust({ ground: { t2: { infantry: 2 } } }), move] });

  test('a landing from a planet is warned of, leaves that planet and not the space area, and is no landingOverLimit', () => {
    const move = commit('t2');
    const found = table(move);
    const warnings = warningsOf(found, move);
    expectStanding(warnings, code('landingFromPlanet'));
    expect(warnings.map(w => w.code)).not.toContain('landingOverLimit');
    expect(warnings.find(w => w.code === code('landingFromPlanet'))?.params).toEqual({ planetId: 't1', from: 't2', unit: 'infantry', count: 1 });
    const end = endOf(found);
    expect(end.ground.t2).toEqual({ infantry: 1 });
    expect(end.ground.t1).toEqual({ infantry: 1 });
    expect(end.control.t1).toBe('me');
  });

  test('more than the source planet holds is missing there', () => {
    const move = commit('t2', { infantry: 3 });
    expect(warningsOf(table(move), move).map(w => w.code)).toContain('unitsMissing');
  });

  test('a landing from the space area names no planet and is not warned of', () => {
    const move = tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    expect(warningsOf(table(move), move).map(w => w.code)).not.toContain(code('landingFromPlanet'));
  });
});

describe('placeOnPlanet, exploreCondition, attachCard', () => {
  // The kernel's state is read-only; these helpers of the old replay write to theirs.
  const board = () => structuredClone(endOf(bench({ faction: 'sol', game: { planetControl: { h1: 'me', t1: 'me' } } })));

  test('placeOnPlanet adds the units and warns placeNotControlled for a planet that is not mine', () => {
    const state = board();
    const warnings: ReturnType<typeof Array<never>> = [];
    placeOnPlanet(state, 't1', { infantry: 2 }, warnings as never);
    placeOnPlanet(state, 't2', { infantry: 1 }, warnings as never);
    expect(state.ground.t1).toEqual({ infantry: 2 });
    expect(state.ground.t2).toEqual({ infantry: 1 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual(expect.objectContaining({ code: code('placeNotControlled'), params: { planetId: 't2' } }));
  });

  test('exploreCondition: a mech keeps the infantry, else one infantry is removed, else it warns and says no', () => {
    const state = board();
    const warnings: never[] = [];
    state.ground.t1 = { mech: 1, infantry: 1 };
    expect(exploreCondition(state, 't1', warnings as never)).toBe(true);
    expect(state.ground.t1).toEqual({ mech: 1, infantry: 1 });
    state.ground.t1 = { infantry: 2 };
    expect(exploreCondition(state, 't1', warnings as never)).toBe(true);
    expect(state.ground.t1).toEqual({ infantry: 1 });
    state.ground.t1 = {};
    expect(exploreCondition(state, 't1', warnings as never)).toBe(false);
    expect(warnings).toHaveLength(1);
  });

  test('attachCard records the card on the planet and warns attachTarget for a planet not mine, a home planet, a legendary one', () => {
    const table = bench({ faction: 'sol', game: { planetControl: { h1: 'me', t1: 'me' } } });
    const state = structuredClone(endOf(table));
    const warnings: { code: string; params: Record<string, unknown> }[] = [];
    attachCard(table.game, state, 't1', 'relic:nanoforge', table.pack, warnings as never, { notHome: true });
    attachCard(table.game, state, 't2', 'relic:nanoforge', table.pack, warnings as never, { notHome: true });
    attachCard(table.game, state, 'h1', 'relic:nanoforge', table.pack, warnings as never, { notHome: true });
    expect(state.attachments).toEqual({ t1: ['relic:nanoforge'], t2: ['relic:nanoforge'], h1: ['relic:nanoforge'] });
    expect(warnings.map(w => [w.code, w.params.planetId, w.params.reason])).toEqual([
      ['attachTarget', 't2', 'notControlled'],
      ['attachTarget', 'h1', 'home'],
    ]);
  });
});
