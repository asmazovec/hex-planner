/** LRR 43 Ground Forces. Source: tirules2 rules-reference/ground-forces.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { codesOf, forecast, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();

describe('LRR 43 Ground Forces', () => {
  test('43 (intro): infantry and mechs are ground forces', () => {
    const pok = loadPack(['pok']);
    expect(pok.units.infantry?.ground).toBe(true);
    expect(pok.units.mech?.ground).toBe(true);
    expect(pok.units.fighter?.ground).toBe(false);
  });

  test('43.1: ground forces in a space area beyond what ships there carry are warned about', () => {
    const build = tactical(HOME, { production: { infantry: 2 } });
    // No planet of mine in the home system, so the produced infantry stay in its space area, with no ship.
    const game = rulesGame({ entries: [build], game: { docks: ['h1'], planetControl: { h1: 'enemy', h2: 'enemy' } } });
    expect(codesOf(game, pack, build)).toContain('capacitySystem');
  });

  test('43.1: ground forces left behind in a space area with no ship to carry them are warned about', () => {
    // The carrier flies off and the two infantry stay in the home system's space area alone.
    const leave = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1, infantry: 2 } }, entries: [leave] });
    expect(forecast(game, pack).state.systems[HOME]).toEqual({ infantry: 2 });
    expect(codesOf(game, pack, leave)).toContain('capacitySystem');
  });

  test('43.2: ground forces carried by a ship stand in the space area with it', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }] });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [move] }), pack);
    expect(state.systems[TARGET]).toEqual({ carrier: 1, infantry: 2 });
    expect(state.ground.t1).toBeUndefined();
  });

  test('43.3: there is no limit to ground forces on a planet', () => {
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 3, infantry: 12 } }],
      landings: [{ planetId: 't1', units: { infantry: 12 } }],
    });
    const game = rulesGame({ units: { [NEAR]: { carrier: 3, infantry: 12 } }, entries: [land] });
    expect(codesOf(game, pack, land)).toEqual([]);
  });
});
