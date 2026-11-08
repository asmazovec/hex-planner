/** LRR 76 Ships. Source: tirules2 rules-reference/ships.md. Base pack: a carrier I has capacity 4; a Fighter II moves 2. */
import { describe, expect, test } from 'vitest';
import { unitStats } from '../../unitStats';
import { codesOf, FACTION, forecast, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();

describe('LRR 76 Ships', () => {
  test('76.1: produced ships are placed in space', () => {
    const build = tactical(HOME, { production: { destroyer: 1 } });
    expect(forecast(rulesGame({ entries: [build], game: { docks: ['h1'] } }), pack).state.systems[HOME]).toEqual({ destroyer: 1 });
  });

  test('76.1: a ship cannot land on a planet: such a landing is warned about', () => {
    const move = tactical(TARGET, {
      moves: [{ from: NEAR, units: { cruiser: 1 } }], landings: [{ planetId: 't1', units: { cruiser: 1 } }],
    });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('shipOnPlanet');
  });

  test('76.1: fighters are ships too and stay in space', () => {
    const move = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, fighter: 2 } }], landings: [{ planetId: 't1', units: { fighter: 2 } }],
    });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, fighter: 2 } }, entries: [move] });
    expect(forecast(game, pack).state.ground.t1).toBeUndefined();
  });

  test('76.2: ships in a system beyond the fleet pool are warned about', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { destroyer: 4 } }] });
    const game = rulesGame({ units: { [NEAR]: { destroyer: 4 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('fleetPool');
  });

  test('76.2 / 37.3: the limit holds the moment ships arrive: a battle that later destroys the excess does not undo it', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { destroyer: 4 } }], losses: { destroyer: 1 } });
    const game = rulesGame({ units: { [NEAR]: { destroyer: 4 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('fleetPool');
  });

  test('76.2: the limit counts the whole system: ships already there count with those arriving', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { destroyer: 2 } }] });
    const game = rulesGame({ units: { [NEAR]: { destroyer: 2 }, [TARGET]: { cruiser: 2 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('fleetPool');
  });

  test('76.2: produced ships count against the fleet pool too', () => {
    const build = tactical(HOME, { production: { destroyer: 2 } });
    const game = rulesGame({ units: { [HOME]: { cruiser: 2 } }, entries: [build], game: { docks: ['h1'] } });
    expect(codesOf(game, pack, build)).toContain('fleetPool');
  });

  test('76.2.1: fighters do not count toward the fleet pool', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 3, fighter: 4 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 3, fighter: 4 } }, entries: [move] });
    expect(codesOf(game, pack, move)).not.toContain('fleetPool');
  });

  test('76.2.1: fighters count against capacity instead', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, fighter: 4 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, fighter: 4 }, [TARGET]: { fighter: 1 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('capacitySystem');
  });

  test('76.3: a ship has cost, combat, move and capacity attributes', () => {
    const carrier = unitStats(FACTION, 'carrier', false, pack);
    expect(carrier).toMatchObject({ cost: 3, combat: 9, move: 1, capacity: 4 });
    const upgraded = unitStats(FACTION, 'carrier', true, pack);
    expect(upgraded?.move).toBe(2);
  });

  test('76 note 1: a Fighter II may count toward the fleet pool when capacity runs out', () => {
    const fits = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, fighter: 6 } }] });
    const over = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, fighter: 7 } }] });
    const upgrades = { upgrades: { me: ['fighter' as const], opponents: {} } };
    const fitsGame = rulesGame({ units: { [NEAR]: { carrier: 1, fighter: 6 } }, entries: [fits], game: upgrades });
    const overGame = rulesGame({ units: { [NEAR]: { carrier: 1, fighter: 7 } }, entries: [over], game: upgrades });
    expect(codesOf(fitsGame, pack, fits)).not.toContain('fleetPool');
    expect(codesOf(fitsGame, pack, fits)).not.toContain('capacitySystem');
    expect(codesOf(overGame, pack, over)).toContain('fleetPool');
  });
});
