/**
 * LRR 68 Production. Source: tirules2 rules-reference/production.md.
 * A space dock I produces its planet's resources + 2: h1 (3) gives 5, h2 (1) gives 3, t1 (2) gives 4, t2 (1) gives 3.
 */
import { describe, expect, test } from 'vitest';
import { effectsOf } from '../../effects/registry';
import type { ComponentEffect } from '../../effects/types';
import '../../effects/points/production';
import { emptyHoldings } from '../../holdings';
import { productionCost } from '../../project';
import { codesOf, FACTION, forecast, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();
const atHome = { docks: ['h1'] };
const bothTargets = { docks: ['t1', 't2'], planetControl: { t1: 'me' as const, t2: 'me' as const } };

/** A throwaway passive effect held through the component `HOLD`, in place of a component's file. */
const HOLD = 'technology:aida';
const held = (edited: ReturnType<typeof rulesPack>, modify: ComponentEffect['modify']): void => {
  (effectsOf(edited) as Map<string, ComponentEffect>).set(HOLD, { tier: 'passive', rule: 'test', modify });
};
const withTech = (target: ReturnType<typeof tactical>) =>
  rulesGame({ entries: [target], game: { ...atHome, start: { me: { technologies: [HOLD] }, opponents: {} } } });

describe('LRR 68 Production', () => {
  test('68.1: the units produced cannot exceed the production value of the active system', () => {
    // A space dock produces its planet's resources + 2: h1 has 3, so 5 units. The pack keeps no production value yet.
    const build = tactical(HOME, { production: { fighter: 6 } , moves: [{ from: NEAR, units: { carrier: 2 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 2 } }, entries: [build], game: atHome });
    expect(codesOf(game, pack, build)).toContain('productionOver');
  });

  test('68.1: exactly the production value is allowed', () => {
    const build = tactical(HOME, { production: { destroyer: 5 }, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [build], game: atHome });
    expect(codesOf(game, pack, build)).not.toContain('productionOver');
  });

  test('68.1.1: several producing units in the active system add their values: docks on t1 (4) and t2 (3) allow 7, not 8', () => {
    const seven = tactical(TARGET, { production: { infantry: 7 }, productionGround: { t1: { infantry: 4 }, t2: { infantry: 3 } } });
    const eight = tactical(TARGET, { production: { infantry: 8 }, productionGround: { t1: { infantry: 4 }, t2: { infantry: 4 } } });
    expect(codesOf(rulesGame({ entries: [seven], game: bothTargets }), pack, seven)).not.toContain('productionOver');
    expect(codesOf(rulesGame({ entries: [eight], game: bothTargets }), pack, eight)).toContain('productionOver');
  });

  test('68.1.1: production value comes only from the active system: a dock elsewhere adds nothing', () => {
    const build = tactical(HOME, { production: { infantry: 6 } });
    const game = rulesGame({ entries: [build], game: { docks: ['h1', 't1'], planetControl: { t1: 'me' } } });
    expect(codesOf(game, pack, build)).toContain('productionOver');
  });

  test('68.1.2: each fighter or infantry counts toward the production limit', () => {
    const build = tactical(HOME, { production: { infantry: 6 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('productionOver');
  });

  test('68.1.3: one infantry instead of two still costs the whole cost', () => {
    expect(productionCost({ infantry: 1 }, FACTION, emptyHoldings(), pack)).toBe(1);
  });

  test('68.1.4: infantry from space docks that give no value to infantry (a component says so) are warned of; mechs and ships are not', () => {
    const edited = rulesPack();
    held(edited, { dockInfantry: () => 0 });
    const infantry = tactical(HOME, { production: { infantry: 2 } });
    expect(codesOf(withTech(infantry), edited, infantry)).toContain('dockInfantry');
    const ships = tactical(HOME, { production: { cruiser: 1, mech: 1 } });
    expect(codesOf(withTech(ships), edited, ships)).not.toContain('dockInfantry');
  });

  test('67.1, units War Sun 1: a war sun produced is warned of: the check does not know who owns the unit upgrade, a component lifts it', () => {
    const build = tactical(HOME, { production: { warsun: 1 }, payment: { planets: ['h1', 'h2'], tradeGoods: 9 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('warSunLocked');
  });

  test('68.1.1: a planet that a component makes a producer adds its value to the system\'s', () => {
    const build = tactical(HOME, { production: { infantry: 6 } });
    const edited = rulesPack();
    held(edited, { planetProduction: (v, ctx) => (ctx.planetId === 'h2' ? 1 : v) });
    const game = rulesGame({ entries: [build], game: { ...atHome, planetControl: { h2: 'me' }, start: { me: { technologies: [HOLD] }, opponents: {} } } });
    expect(codesOf(game, edited, build)).not.toContain('productionOver');
  });

  test('68.2: produced ships are placed in the active system\'s space area', () => {
    const build = tactical(HOME, { production: { cruiser: 1 } });
    expect(forecast(rulesGame({ entries: [build], game: atHome }), pack).state.systems[HOME]).toEqual({ cruiser: 1 });
  });

  test('68.2: a ship bought on a planet still goes to the space area', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, productionGround: { h1: { cruiser: 1 } } });
    const { state } = forecast(rulesGame({ entries: [build], game: atHome }), pack);
    expect(state.systems[HOME]).toEqual({ cruiser: 1 });
    expect(state.ground.h1).toBeUndefined();
  });

  test('68.3: produced ground forces are placed on the planet holding the producing space dock', () => {
    const build = tactical(HOME, { production: { infantry: 2 } });
    const { state } = forecast(rulesGame({ entries: [build], game: { docks: ['h2'] } }), pack);
    expect(state.ground.h2).toEqual({ infantry: 2 });
  });

  test('68.3: ground forces placed on a controlled planet without a producing unit are warned about', () => {
    const build = tactical(HOME, { production: { infantry: 2 }, productionGround: { h2: { infantry: 2 } } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('productionPlace');
  });

  test('68.3: a planet I just invaded in this action has no dock of mine, so produced infantry do not go there', () => {
    const invade = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
      production: { infantry: 2 },
    });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [invade], game: { docks: ['t2'], planetControl: { t2: 'me' } } });
    expect(forecast(game, pack).state.ground.t1).toEqual({ infantry: 1 });
    expect(forecast(game, pack).state.ground.t2).toEqual({ infantry: 2 });
  });

  test.todo('68.4: ground forces from a producing unit in the space area may go to space or a controlled planet — not modelled: no unit with Production in space exists in the packs the planner places');

  test('68 note 1: the production value counts units, not their cost: three dreadnoughts from a dock of 5 are within it', () => {
    const build = tactical(HOME, { production: { dreadnought: 3 } });
    const codes = codesOf(rulesGame({ entries: [build], game: atHome }), pack, build);
    expect(codes).not.toContain('productionOver');
    expect(codes).toContain('shortResources');
  });

  test('68 note 2: placement is bound by where the producing units are, not by each one\'s value: 7 infantry may all go on t1', () => {
    const build = tactical(TARGET, { production: { infantry: 7 }, productionGround: { t1: { infantry: 7 } } });
    const game = rulesGame({ entries: [build], game: bothTargets });
    expect(forecast(game, pack).state.ground.t1).toEqual({ infantry: 7 });
    expect(codesOf(game, pack, build)).not.toContain('productionPlace');
  });

  test.todo('68 note 3: a faction\'s own ship counts as its type for effects that produce a named ship — not modelled: no effect produces a named type');
});
