import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './swa2';

const flight = (faction: string, units: UnitCounts, technologies: string[]) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units }] });
  return { move, ...bench({ faction, expansions: ['pok'], units: { [HOME]: units }, start: { technologies }, entries: [move] }) };
};

describe('technology:swa2 Strike Wing Alpha II', () => {
  // "Cost 1, Combat 7, Move 2, Capacity 1"
  // Checks: an Argent destroyer upgraded by Strike Wing Alpha II carries one infantry, and no capacity warning is made.
  // Why the default limit does not apply: the unit's own numbers (97.4) put its capacity at 1, generated from the
  // faction's level II: a number of the count (a `modify`), nothing is waived.
  test('technology:swa2 a destroyer carries one infantry within its capacity of 1', () => {
    const table = flight('argent', { destroyer: 1, infantry: 1 }, [id]);
    quote(table.pack, id, 'Capacity 1');
    expectNone(warningsOf(table, table.move), 'capacityGroup');
  });

  // Checks: a second infantry is beyond the capacity of 1.
  // Why the check is NOT redundant here: the upgrade sets the capacity to 1, not beyond.
  test('technology:swa2 a second infantry is still over capacity', () => {
    const table = flight('argent', { destroyer: 1, infantry: 2 }, [id]);
    expectStanding(warningsOf(table, table.move), 'capacityGroup');
    expect(warningsOf(table, table.move).find(w => w.code === 'capacityGroup')?.params).toMatchObject({ capacity: 1, load: 2 });
  });

  // LRR 16.1: "A unit's capacity value indicates the maximum combined number of fighters and ground forces that it can transport."
  // Checks: the common Destroyer II of another faction has no capacity, so one infantry on it is over.
  // Why the check is NOT redundant here: the capacity of 1 is the Argent Flight's own destroyer.
  test('technology:swa2 the common Destroyer II of another faction carries nothing', () => {
    const table = flight('sol', { destroyer: 1, infantry: 1 }, ['technology:dd2']);
    expectStanding(warningsOf(table, table.move), 'capacityGroup');
  });

  // "When this unit uses ANTI-FIGHTER BARRAGE, each result of 9 or 10 also destroys 1 of your opponents infantry"
  // Checks: the upgrade is passive (its numbers) and lifts nothing.
  // Why nothing else is validated: the barrage and the infantry it destroys are dice, which the plan does not roll.
  test('technology:swa2 is a passive effect with its generated numbers and no waiver', () => {
    const { pack } = flight('argent', { destroyer: 1 }, [id]);
    quote(pack, id, 'each result of 9 or 10 also destroys 1 of your opponents infantry');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.capacity).toBeDefined();
  });
});
