import { describe, expect, test } from 'vitest';
import type { Warning } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './hcf2';

/** A cruiser (no capacity) flies with `fighters` fighters to the next system; the fleet pool holds its starting 3. */
const flight = (fighters: number, faction = 'naalu', technology = id) => {
  const units = { cruiser: 1, fighter: fighters };
  const move = tactical(NEAR, { moves: [{ from: HOME, units }] });
  return { move, ...bench({ faction, units: { [HOME]: units }, start: { technologies: [technology] }, entries: [move] }) };
};
const fleetOf = (warnings: Warning[]) => warnings.find(w => w.code === 'fleetPool')?.params;

describe('technology:hcf2 Hybrid Crystal Fighter II', () => {
  // "This unit may move without being transported."
  // Checks: four fighters fly beside a cruiser that has no capacity, and no capacity warning is made.
  // Why the check is redundant here: the capacity check (16.1) counts fighters only where they cannot move by
  // themselves; the upgrade gives them a move value, which the generated numbers of the unit upgrade already do.
  test('technology:hcf2 fighters fly without being transported: no capacity warning', () => {
    const table = flight(4);
    quote(table.pack, id, 'This unit may move without being transported.');
    const warnings = warningsOf(table, table.move);
    expectNone(warnings, 'capacityGroup');
    expectNone(warnings, 'capacitySystem');
  });

  // "Fighters in excess of your ships' capacity count as 1/2 of a ship against your fleet pool."
  // Checks: one cruiser and four fighters beyond capacity weigh 1 + 4/2 = 3 ships, within the fleet pool of 3.
  // Why the default count does not apply: Fighter II counts each excess fighter as a ship (1 + 4 = 5 over 3); this card
  // changes that number, a `modify`: nothing is listed as waived.
  test.fails('technology:hcf2 four excess fighters count as two ships: within the fleet pool, no warning', () => {
    const table = flight(4);
    quote(table.pack, id, "Fighters in excess of your ships' capacity count as 1/2 of a ship against your fleet pool.");
    expectNone(warningsOf(table, table.move), 'fleetPool');
  });

  // Checks: six excess fighters weigh three ships, so with the cruiser four stand against the pool of 3, and the
  // warning names the halved count.
  // Why the check is NOT redundant here: the card halves the excess fighters, it does not take them out of the count.
  test.fails('technology:hcf2 six excess fighters still overrun the fleet pool, counted as three ships', () => {
    const table = flight(6);
    const warnings = warningsOf(table, table.move);
    expectStanding(warnings, 'fleetPool');
    expect(fleetOf(warnings)).toMatchObject({ ships: 4, fleet: 3 });
  });

  // Fighter II: "Fighters in excess of your ships' capacity count against your fleet pool."
  // Checks: another faction with the common Fighter II counts the four excess fighters as four ships.
  // Why the check is NOT redundant here: the halving is printed on the Naalu card alone.
  test('technology:hcf2 is the Naalu\'s own: Fighter II counts each excess fighter as a ship', () => {
    const table = flight(4, 'sol', 'technology:ff2');
    const warnings = warningsOf(table, table.move);
    expectStanding(warnings, 'fleetPool');
    expect(fleetOf(warnings)).toMatchObject({ ships: 5, fleet: 3 });
  });

  // Checks: fighters within the capacity of a carrier are no ships at all, with or without the card.
  test('technology:hcf2 fighters within capacity count nothing against the fleet pool', () => {
    const units = { carrier: 1, fighter: 4 };
    const move = tactical(NEAR, { moves: [{ from: HOME, units }] });
    const table = bench({ faction: 'naalu', units: { [HOME]: units }, start: { technologies: [id] }, entries: [move] });
    expectNone(warningsOf(table, move), 'fleetPool');
  });

  test.todo('technology:hcf2 an odd number of excess fighters weighs half a ship: no ruling found on rounding, the count keeps halves');

  test.fails('technology:hcf2 is a passive effect that changes the count of excess fighters', () => {
    const { pack } = flight(1);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(Object.keys(effect(pack, id).modify ?? {}).sort()).toEqual(['capacity', 'excessFighters', 'speed', 'unitCost']);
  });
});
