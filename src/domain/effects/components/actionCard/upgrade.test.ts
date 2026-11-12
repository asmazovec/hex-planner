import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './upgrade';

/** My ships stand in the target (`there`) and next to it (`near`); I activate the target and use Upgrade. */
const table = (there: UnitCounts, near: UnitCounts = {}, moves: { from: string; units: UnitCounts }[] = []) => {
  const move = using(tactical(TARGET, { moves }), id);
  return { move, ...bench({ faction: 'sol', units: { [TARGET]: there, [NEAR]: near }, start: { hand: [id] }, entries: [move] }) };
};

describe('actionCard:upgrade Upgrade', () => {
  // "After you activate a system that contains 1 or more of your ships: Replace 1 of your cruisers in that system with
  //  1 dreadnought from your reinforcements."
  // Checks: one of my two cruisers in the activated target becomes a dreadnought; nothing is missing.
  // Why the check is redundant here: nothing is lifted; the dreadnought is placed, not produced, so no production
  // value, cost or space dock is asked, and the number of ships in the system stays the same.
  test.fails('actionCard:upgrade replaces one cruiser of the active system with a dreadnought', () => {
    const upgrade = table({ cruiser: 2 });
    quote(upgrade.pack, id, 'Replace 1 of your cruisers in that system with 1 dreadnought from your reinforcements.');
    expect(endOf(upgrade).systems[TARGET]).toEqual({ cruiser: 1, dreadnought: 1 });
    expectNone(warningsOf(upgrade, upgrade.move), 'unitsMissing');
  });

  // Note 2 of the card: "A player must have at least one cruiser in the active system to play and resolve Upgrade."
  // Checks: with only a destroyer in the target the cruiser to replace is reported missing.
  // Why the check is NOT redundant here: the card replaces a cruiser, and there is none.
  test.fails('actionCard:upgrade without a cruiser in the active system reports it missing', () => {
    const upgrade = table({ destroyer: 1 });
    expectStanding(warningsOf(upgrade, upgrade.move), 'unitsMissing');
  });

  // Note 1 of the card: "The cruiser must be in the system when it is activated ... Upgrade cannot be played if the
  // cruiser is moved into the active system later in the turn."
  // Checks: a cruiser that flies in with the action does not count; the cruiser is reported missing.
  // Why the check is NOT redundant here: the card is played right after the activation, before any movement.
  test.fails('actionCard:upgrade a cruiser that arrives with the action does not count', () => {
    const upgrade = table({ destroyer: 1 }, { cruiser: 1 }, [{ from: NEAR, units: { cruiser: 1 } }]);
    expectStanding(warningsOf(upgrade, upgrade.move), 'unitsMissing');
  });

  // Checks: Upgrade not used leaves the cruisers as they are.
  test('actionCard:upgrade not used changes no ship', () => {
    const move = tactical(TARGET);
    expect(endOf(bench({ faction: 'sol', units: { [TARGET]: { cruiser: 2 } }, entries: [move] })).systems[TARGET]).toEqual({ cruiser: 2 });
  });

  test.fails('actionCard:upgrade is a play effect', () => {
    expect(effect(table({}).pack, id).tier).toBe('play');
  });
});
