/**
 * LRR 67 Producing Units. Source: tirules2 rules-reference/producing-units.md.
 * Base pack costs: a cruiser 2, a dreadnought 4, a fighter or an infantry 1 for two.
 */
import { describe, expect, test } from 'vitest';
import { emptyHoldings } from '../../holdings';
import { productionCost } from '../../project';
import { CARD } from '../../strategy';
import { placeOnPlanet } from '../../replay/invasion';
import type { Game, Warning } from '../../types';
import { adjust, codesOf, FACTION, forecast, HOME, NEAR, rulesGame, rulesPack, secondary, tactical, TARGET } from '../kit';

const pack = rulesPack();
const cost = (units: Parameters<typeof productionCost>[0]) => productionCost(units, FACTION, emptyHoldings(), pack);
const atHome = { docks: ['h1'] };

const withLimits = rulesPack(p => {
  for (const [id, limit] of Object.entries({ carrier: 4, cruiser: 8, destroyer: 8, dreadnought: 5, warsun: 2, flagship: 1, mech: 4 })) {
    const def = p.units[id as keyof typeof p.units];
    if (def) def.limit = limit;
  }
});

const RIVAL = 'rival';
const rivalPack = rulesPack(p => {
  p.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
});
const withRival = (extra: Partial<Game> = {}): Partial<Game> => ({
  opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }], ...extra,
});

describe('LRR 67 Producing Units', () => {
  test('67.1: producing a unit costs its cost value', () => {
    expect(cost({ cruiser: 1 })).toBe(2);
    expect(cost({ dreadnought: 1 })).toBe(4);
  });

  test('67.1: spending less than the cost is warned about', () => {
    const build = tactical(HOME, { production: { dreadnought: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('shortResources');
  });

  test('67.1.1: only planets the producing player controls pay', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['t1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('shortResources');
  });

  test('67.1.1: trade goods the player holds pay too', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h2'], tradeGoods: 1 } });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 1 }, 'strategy'), build], game: atHome });
    expect(codesOf(game, pack, build)).toEqual([]);
  });

  test('67.1.2: resources spent beyond the cost are lost', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [build], game: atHome });
    expect(codesOf(game, pack, build)).toEqual([]);
    expect(forecast(game, pack).state.exhausted).toEqual(['h1']);
  });

  test('67.1.2: the excess of one production does not carry to the next', () => {
    const first = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const second = tactical(NEAR, { production: { destroyer: 1 }, payment: { planets: [], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [first, second], game: { docks: ['h1'] } }), pack, second)).toContain('shortResources');
  });

  test('67.1.3: the costs of several units add up to one total', () => {
    expect(cost({ cruiser: 2, dreadnought: 1 })).toBe(8);
  });

  test('67.1.3: a dreadnought and a fighter make one total of 5, which four resources do not cover', () => {
    const build = tactical(HOME, { production: { dreadnought: 1, fighter: 1 }, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('shortResources');
  });

  test('67.2: a cost with two icons produces two units', () => {
    expect(cost({ fighter: 2 })).toBe(1);
    expect(cost({ infantry: 2 })).toBe(1);
  });

  test('67.2: the pair is of one unit type: a fighter and an infantry are two costs', () => {
    expect(cost({ fighter: 1, infantry: 1 })).toBe(2);
  });

  test.todo('67.2.1: each of the pair counts toward the production limit — see 68.1.2, where it is tested');

  test('67.2.2: producing only one of a pair still costs the whole cost', () => {
    expect(cost({ fighter: 1 })).toBe(1);
    expect(cost({ fighter: 3 })).toBe(2);
  });

  test('67.3: production in a tactical action places units by the Production rules: ships in the active system', () => {
    const build = tactical(HOME, { production: { cruiser: 1, infantry: 2 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const { state } = forecast(rulesGame({ entries: [build], game: atHome }), pack);
    expect(state.systems[HOME]).toEqual({ cruiser: 1 });
    expect(state.ground.h1).toEqual({ infantry: 2 });
  });

  test('67.4: production outside a tactical action places units where the ability says: Warfare\'s secondary in the home system', () => {
    const follow = secondary(CARD.warfare, { production: { systemId: HOME, units: { cruiser: 1 } }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [follow], game: atHome });
    expect(forecast(game, pack).state.systems[HOME]).toEqual({ cruiser: 1 });
    expect(codesOf(game, pack, follow)).toEqual([]);
  });

  test('67.4.1: a unit cannot be produced on a planet the player does not control', () => {
    const build = tactical(TARGET, { production: { infantry: 2 }, productionGround: { t1: { infantry: 2 } } });
    const game = rulesGame({ entries: [build], game: { docks: ['t2'], planetControl: { t2: 'me' } } });
    expect(forecast(game, pack).state.ground.t1).toBeUndefined();
  });

  test('67.4.1: a card\'s production cannot place ground forces on a planet the player does not control', () => {
    const follow = secondary(CARD.warfare, {
      production: { systemId: TARGET, units: { infantry: 2 }, ground: { t1: { infantry: 2 } } }, payment: { planets: ['h1'], tradeGoods: 0 },
    });
    const game = rulesGame({ entries: [follow], game: { docks: ['t2'], planetControl: { t2: 'me' } } });
    expect(forecast(game, pack).state.ground.t1).toBeUndefined();
  });

  test('67.4.2: production in a system puts ground forces in its space area or on a planet the player controls there', () => {
    const follow = secondary(CARD.warfare, { production: { systemId: HOME, units: { infantry: 2 } }, payment: { planets: ['h2'], tradeGoods: 0 } });
    const { state } = forecast(rulesGame({ entries: [follow], game: atHome }), pack);
    expect(state.ground.h1 ?? state.ground.h2 ?? state.systems[HOME]).toEqual({ infantry: 2 });
  });

  test('67.5 / 72.1: producing more ships than the reinforcements hold is warned about', () => {
    const build = tactical(HOME, { production: { carrier: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ units: { [NEAR]: { carrier: 4 } }, entries: [build], game: atHome });
    expect(codesOf(game, withLimits, build)).toContain('reinforcementsOut');
  });

  test('67.5: the units already on the board count against the limit, wherever they stand, ground units on planets too', () => {
    const build = tactical(HOME, { production: { mech: 1 } });
    const pokPack = rulesPack(p => {
      p.units.mech = { id: 'mech', name: 'Mech', cost: 2, capacity: 0, capacityUsed: 1, ground: true, fighter: false, combat: 6, move: null, limit: 4 };
    });
    const game = rulesGame({ entries: [adjust({ ground: { h2: { mech: 4 } } }, 'strategy'), build], game: atHome });
    expect(codesOf(game, pokPack, build)).toContain('reinforcementsOut');
  });

  test.todo('67.5.1: a unit missing from reinforcements may be taken from a system without my command token and produced at once — not modelled: the reinforcement limit itself is not checked (see 67.5)');

  test('67.5.2 / 36.1: fighters and infantry are not limited: tokens stand in for them', () => {
    const build = tactical(HOME, { production: { fighter: 2 }, moves: [{ from: NEAR, units: { carrier: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, fighter: 20 } }, entries: [build], game: atHome });
    expect(codesOf(game, withLimits, build)).not.toContain('reinforcementsOut');
  });

  test('67.6: ships cannot be produced in a system holding another player\'s ships', () => {
    const build = tactical(TARGET, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({
      entries: [build],
      game: withRival({ docks: ['t1'], planetControl: { t1: 'me' }, enemyUnits: { [TARGET]: { [RIVAL]: { destroyer: 1 } } } }),
    });
    expect(codesOf(game, rivalPack, build)).toContain('productionBlockaded');
  });

  test('67.6: the same holds for a card\'s production', () => {
    const follow = secondary(CARD.warfare, { production: { systemId: HOME, units: { cruiser: 1 } }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [follow], game: withRival({ ...atHome, enemyUnits: { [HOME]: { [RIVAL]: { destroyer: 1 } } } }) });
    expect(codesOf(game, rivalPack, follow)).toContain('productionBlockaded');
  });

  test('67.6.1: ground forces can still be produced there', () => {
    const build = tactical(TARGET, { production: { infantry: 2 }, payment: { planets: ['h2'], tradeGoods: 0 } });
    const game = rulesGame({
      entries: [build],
      game: withRival({ docks: ['t1'], planetControl: { t1: 'me' }, enemyUnits: { [TARGET]: { [RIVAL]: { destroyer: 1 } } } }),
    });
    expect(codesOf(game, rivalPack, build)).not.toContain('productionBlockaded');
    expect(forecast(game, rivalPack).state.ground.t1).toEqual({ infantry: 2 });
  });

  test('67 / 79: producing in a system without a unit with Production is warned about', () => {
    const build = tactical(NEAR, { production: { cruiser: 1 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('noProduction');
  });

  test('67 note 1: a produced unit must be paid for: a card\'s production with no payment is warned about', () => {
    const follow = secondary(CARD.warfare, { production: { systemId: HOME, units: { cruiser: 1 } } });
    expect(codesOf(rulesGame({ entries: [follow], game: atHome }), pack, follow)).toContain('shortResources');
  });

  test('67 note 2: one fighter and one infantry cannot be bought for one resource', () => {
    const build = tactical(HOME, { production: { fighter: 1, infantry: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('shortResources');
  });

  test.todo('67 note 3: a faction\'s own version of a unit type counts as that type for production effects — not modelled: no effect produces a named type');
  test.todo('67 note 4: a unit taken back from the board to be produced comes undamaged — not modelled: damage is not tracked');
});

describe('LRR 67.4.1 units an ability places (placeNotControlled)', () => {
  test('67.4.1: units placed on a planet the player does not control are warned of, and still placed', () => {
    const state = forecast(rulesGame({ game: { planetControl: { h1: 'me' } } }), pack).state;
    const warnings: Warning[] = [];
    placeOnPlanet(state, 'h1', { infantry: 1 }, warnings);
    placeOnPlanet(state, 't1', { infantry: 1 }, warnings);
    expect(warnings.map(w => [w.code, w.params.planetId])).toEqual([['placeNotControlled', 't1']]);
    expect(state.ground.t1).toEqual({ infantry: 1 });
  });
});
