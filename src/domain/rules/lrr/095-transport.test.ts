/** LRR 95 Transport. Source: tirules2 rules-reference/transport.md. */
import { describe, expect, test } from 'vitest';
import { tacticalMeters } from '../../../testing/meters';
import type { TacticalEntry } from '../../tactical';
import { adjust, before, codesOf, forecast, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET, tech } from '../kit';
import { row } from './kit-83-101';

const pack = rulesPack();
const carrierTwo = { start: { me: { technologies: [tech('carrier')] }, opponents: {} } };

describe('LRR 95 Transport', () => {
  test('95 (intro): a moving ship carries fighters and ground forces up to its capacity', () => {
    const over = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, fighter: 3, infantry: 2 } }] });
    expect(codesOf(rulesGame({ units: { [NEAR]: { carrier: 1, fighter: 3, infantry: 2 } }, entries: [over] }), pack, over)).toContain('capacityGroup');
  });

  test('95.1: a ship picks up units in a system it moves through', () => {
    const action = tactical(TARGET, { moves: [
      { from: HOME, units: { carrier: 1 }, via: [NEAR] },
      { from: NEAR, units: { fighter: 2 }, pickupOf: HOME },
    ] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1 }, [NEAR]: { fighter: 2 } }, entries: [action], game: carrierTwo });
    expect(codesOf(game, pack, action)).toEqual([]);
    const { state } = forecast(game, pack);
    expect(state.systems[TARGET]).toEqual({ carrier: 1, fighter: 2 });
    expect(state.systems[NEAR] ?? {}).toEqual({});
  });

  test('95.1: a ship picks up ground forces from a planet of the system it starts in', () => {
    const action = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }, { from: 'h1', units: { infantry: 2 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [adjust({ ground: { h1: { infantry: 2 } } }, 'strategy'), action], game: carrierTwo });
    expect(codesOf(game, pack, action)).toEqual([]);
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ carrier: 1, infantry: 2 });
  });

  test('95.1: a ship cannot pick up units in a system that is neither its start, nor on its way, nor the active system', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1 } }, { from: 'h1', units: { infantry: 1 }, pickupOf: NEAR }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1 } }, entries: [adjust({ ground: { h1: { infantry: 1 } } }, 'strategy'), action] });
    expect(codesOf(game, pack, action)).not.toEqual([]);
  });

  test('95.1: a pickup off the way of its ship is warned about by its own code', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1 } }, { from: 'h1', units: { infantry: 1 }, pickupOf: NEAR }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1 } }, entries: [adjust({ ground: { h1: { infantry: 1 } } }, 'strategy'), action] });
    expect(codesOf(game, pack, action)).toContain('pickupOffRoute');
  });

  test('95.1.1: carried units stay with the ship to the end of its move: they arrive in the active system', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }] });
    expect(forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [action] }), pack).state.systems[TARGET]).toEqual({ carrier: 1, infantry: 2 });
  });

  test.todo('95.1.2: cargo of a ship a gravity rift removes is removed too — not modelled: the rift\'s die is not rolled, losses are entered by hand');

  test('95.2: carried units that do not land stay in the space area of the active system', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [action] }), pack);
    expect(state.systems[TARGET]).toEqual({ carrier: 1, infantry: 1 });
  });

  test('95.3: ground forces cannot be picked up from a system holding the player\'s token other than the active one', () => {
    // A carrier II (move 2) flies from behind the home system, through it (it holds my token), into the system beyond.
    const behind = '-1,0';
    const pickup = tactical(NEAR, { moves: [
      { from: behind, units: { carrier: 1 }, via: [HOME] },
      { from: 'h1', units: { infantry: 1 }, pickupOf: behind },
    ] });
    const game = rulesGame({
      map: { ...row(), [behind]: 'r-empty' },
      units: { [behind]: { carrier: 1 } },
      entries: [adjust({ ground: { h1: { infantry: 1 } } }, 'strategy'), tactical(HOME), pickup],
      game: { start: { me: { technologies: [tech('carrier')] }, opponents: {} } },
    });
    expect(codesOf(game, pack, pickup)).not.toContain('speedShort');
    expect(codesOf(game, pack, pickup)).toContain('sourceActivated');
  });

  test('95.3: units may be picked up in the active system although it holds the player\'s token', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1 } }, { from: 't1', units: { infantry: 1 }, pickupOf: NEAR }],
      landings: [{ planetId: 't2', units: { infantry: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1 } }, entries: [adjust({ ground: { t1: { infantry: 1 } } }, 'strategy'), action], game: { planetControl: { t1: 'me' } } });
    expect(codesOf(game, pack, action)).not.toContain('sourceActivated');
  });

  test('95.4: carried ground forces land on a planet in the invasion step', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't2', units: { infantry: 2 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [action] });
    expect(forecast(game, pack).state.ground.t2).toEqual({ infantry: 2 });
    expect(codesOf(game, pack, action)).toEqual([]);
  });

  test.todo('95 note 1: a Fighter II cannot both fly and be carried by meeting a carrier midway — not modelled: moves are not timed; a flying fighter rides only in its own group');
  test.todo('95 note 2: a ship may carry units while retreating — not modelled: retreats are not planned');

  test('95 note 3: a ship picks up ground forces from a planet of the active system to invade another planet there', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1 } }, { from: 't1', units: { infantry: 2 } }],
      landings: [{ planetId: 't2', units: { infantry: 2 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1 } }, entries: [adjust({ ground: { t1: { infantry: 2 } } }, 'strategy'), action], game: { planetControl: { t1: 'me' } } });
    const { state } = forecast(game, pack);
    expect(state.ground.t2).toEqual({ infantry: 2 });
    expect(state.ground.t1 ?? {}).toEqual({});
  });

  test('95 note 4: a ship cannot pick up more units from a planet than its capacity', () => {
    const action = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }, { from: 'h1', units: { infantry: 8 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [adjust({ ground: { h1: { infantry: 8 } } }, 'strategy'), action], game: carrierTwo });
    expect(codesOf(game, pack, action)).toContain('capacityGroup');
  });

  test('95 note 4.1-4.5: fighters left behind in a system with no capacity are removed, which the plan must show', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, fighter: 2 } }, entries: [action] });
    const codes = codesOf(game, pack, action);
    const left = forecast(game, pack).state.systems[NEAR]?.fighter ?? 0;
    expect(codes.some(code => code.startsWith('capacity')) || left === 0).toBe(true);
  });

  test('95 note 4.6: a carrier with capacity 4 cannot take all eight infantry, even meaning to drop some', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 8 } }] });
    expect(codesOf(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 8 } }, entries: [action] }), pack, action)).toContain('capacityGroup');
  });

  test.todo('95 note 5: ships will carry units from systems with the player\'s token outside a tactical action — not modelled: a future rule change, not in force');

  test('95 / 16.1: cargo picked beyond the capacity flies all the same: it is carried, arrives, lands and counts, and only the warning says so', () => {
    const action = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 6 } }],
      landings: [{ planetId: 't1', units: { infantry: 6 } }],
    });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 6 } }, entries: [action] });
    expect(codesOf(game, pack, action)).toEqual(['capacityGroup']);
    const { state } = forecast(game, pack);
    expect(state.systems[TARGET]).toEqual({ carrier: 1 });
    expect(state.ground.t1).toEqual({ infantry: 6 });
    expect(tacticalMeters(game, action as TacticalEntry, NEAR, before(game, pack, action), pack).group).toEqual({ load: 6, capacity: 4 });
  });

  test('95 / 58.3: units taken beyond what stands at the source fly all the same; the source ends empty and the shortfall is warned about', () => {
    const action = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 6 } }],
      landings: [{ planetId: 't1', units: { infantry: 5 } }],
    });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [action] });
    const warnings = forecast(game, pack).warnings[action.id] ?? [];
    expect(warnings.map(w => w.code).sort()).toEqual(['capacityGroup', 'unitsMissing']);
    expect(warnings.find(w => w.code === 'unitsMissing')?.params).toMatchObject({ where: NEAR, unit: 'infantry', missing: 4 });
    expect(warnings.find(w => w.code === 'capacityGroup')?.params).toMatchObject({ from: NEAR, load: 6 });
    const { state } = forecast(game, pack);
    expect(state.systems[NEAR] ?? {}).toEqual({});
    expect(state.systems[TARGET]).toEqual({ carrier: 1, infantry: 1 });
    expect(state.ground.t1).toEqual({ infantry: 5 });
    expect(tacticalMeters(game, action as TacticalEntry, NEAR, before(game, pack, action), pack).group.load).toBe(6);
  });

  test('95 / 58.3: a ship that is not at the source flies as entered and counts against the fleet pool', () => {
    const action = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 5 } }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [action] });
    expect(codesOf(game, pack, action).sort()).toEqual(['fleetPool', 'unitsMissing']);
    expect(forecast(game, pack).state.systems[NEAR]).toEqual({ cruiser: 5 });
  });
});
