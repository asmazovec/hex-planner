import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, FAR, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './pws2';

/** A Muaat war sun flies three systems, from home to the fourth slot of the row. */
const flight = (technologies: string[]) => {
  const move = tactical(FAR, { moves: [{ from: HOME, units: { warsun: 1 }, via: [NEAR, TARGET] }] });
  return { move, ...bench({ faction: 'muaat', units: { [HOME]: { warsun: 1 } }, start: { technologies }, entries: [move] }) };
};

describe('technology:pws2 Prototype War Sun II', () => {
  // "Cost 10, Combat 3(x3), Move 3, Capacity 6"
  // Checks: with the upgrade the war sun flies three systems without a warning.
  // Why the check is redundant here: the move value the route is checked against (58.3) is that of level II, 3.
  test('technology:pws2 a war sun of level II flies three systems', () => {
    const muaat = flight([id]);
    quote(muaat.pack, id, 'Cost 10, Combat 3(x3), Move 3, Capacity 6');
    expectNone(warningsOf(muaat, muaat.move), 'speedShort');
  });

  // Checks: without the upgrade the Prototype War Sun I (move 1) is short of the route.
  // Why the check is NOT redundant here: the upgrade is not held, the printed move value stands.
  test('technology:pws2 not held, the war sun of level I is short of three systems', () => {
    const muaat = flight([]);
    expectStanding(warningsOf(muaat, muaat.move), 'speedShort');
  });

  // "Other players' units in this system lose PLANETARY SHIELD."
  // Checks: the effect is the generated unit upgrade (97.4) and adds no waiver.
  // Why nothing is validated: Bombardment and Planetary Shield are rolls of the invasion, which the plan does not simulate.
  test('technology:pws2 is the passive unit upgrade, with no waiver', () => {
    const { pack } = flight([]);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).rule).toBe('97.4');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
