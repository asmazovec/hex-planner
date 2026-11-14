import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './sd2';

/** Infantry produced at the dock on h1 (3 resources): Space Dock I makes 5, Space Dock II makes 7. */
const build = (infantry: number, technologies: string[] = []) => {
  const entry = tactical(HOME, { production: { infantry } });
  return { entry, ...bench({ faction: 'hacan', start: { technologies }, entries: [entry], game: { docks: ['h1'] } }) };
};

describe('technology:sd2 Space Dock II', () => {
  // "This unit's PRODUCTION value is equal to 4 more than the resource value of this planet."
  // Checks: seven infantry are produced at the dock on h1 (3 + 4) with no warning of the production value.
  // Why the check finds nothing here: the production limit (68.1) runs against the upgraded value, a `modify`.
  test('technology:sd2 produces its planet\'s resources plus four', () => {
    const table = build(7, [id]);
    quote(table.pack, id, 'equal to 4 more than the resource value of this planet');
    expectNone(warningsOf(table, table.entry), 'productionOver');
  });

  // LRR 79.1 with Space Dock I: "This unit's PRODUCTION value is equal to 2 more than the resource value of this planet."
  // Checks: Space Dock I is over with six; Space Dock II is over with eight.
  // Why the check is NOT redundant here: the upgrade raises the value, it does not lift the limit.
  test('technology:sd2 Space Dock I is over with six units, Space Dock II with eight', () => {
    const one = build(6);
    expectStanding(warningsOf(one, one.entry), 'productionOver');
    const two = build(8, [id]);
    expect(warningsOf(two, two.entry).find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 7, count: 8 });
  });

  test('technology:sd2 is a passive effect that changes the production value', () => {
    const { pack } = build(1, [id]);
    const found = effect(pack, id);
    expect(found.tier).toBe('passive');
    expect(found.modify?.productionValue?.(5, { structure: 'spacedock', planetId: 'h1' })).toBe(7);
  });
});
