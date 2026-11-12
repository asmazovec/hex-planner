import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectStanding, expectWaived, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './dominusorb';

/** The first action activates the home system, so my token lies there; the second moves the cruiser out of it. */
const activateHome = () => tactical(HOME);
const leaveHome = () => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
const table = (entries: Entry[], relics = [id]) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 }, [NEAR]: { destroyer: 1, infantry: 1 } }, start: { relics }, entries });

describe('relic:dominusorb Dominus Orb', () => {
  // "Before you move units during a tactical action, you may purge this card to move and transport units that are in
  //  systems that contain 1 of your command tokens."
  // Checks: the cruiser leaves the home system, which holds my token, in an action that names the Orb in `uses`; the
  // warning is listed and lifted by the relic.
  // Why the check is redundant here: LRR 58.3.3 ("The ship cannot move if it started its movement in another system
  // that contains one of its faction's command tokens.") is the check; the Orb lets units in such systems move, by its
  // own words.
  test.fails('relic:dominusorb lifts the move out of a system with my command token', () => {
    const move = using(leaveHome(), id);
    const orb = table([activateHome(), move]);
    quote(orb.pack, id, 'move and transport units that are in systems that contain 1 of your command tokens');
    expectWaived(warningsOf(orb, move), 'sourceActivated', id);
  });

  // "... to move and transport units ..."
  // Checks: the cruiser flies through NEAR, where my token also lies, and picks up the infantry there; the pickup's
  // warning (95.3) is lifted too.
  // Why the check is redundant here: LRR 95.3 forbids transporting units out of a system with my token other than
  // the active one, and an ability that moves ships must "explicitly allow it to transport units" from such systems
  // (Movement, note 2); the Orb names transport as well as movement.
  test.fails('relic:dominusorb lifts the pickup from a system with my command token', () => {
    const move = using(tactical(TARGET, {
      moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }, { from: NEAR, units: { infantry: 1 }, pickupOf: HOME }],
    }), id);
    const orb = table([tactical(NEAR), move]);
    expectWaived(warningsOf(orb, move), 'sourceActivated', id);
  });

  // LRR 58.3.3: "The ship cannot move if it started its movement in another system that contains one of its faction's
  //  command tokens."
  // Checks: the same move without the Orb in `uses` stands as a breach, though the relic is held.
  // Why the check is NOT redundant here: the Orb is purged to be used; held and not used, it changes nothing.
  test('relic:dominusorb held but not used leaves the check standing', () => {
    const move = leaveHome();
    expectStanding(warningsOf(table([activateHome(), move]), move), 'sourceActivated');
  });

  // Checks: the Orb is purged by its use, so the next tactical action of the round that moves out of a token's system
  // again is warned of, and naming it again is a component no longer held.
  // Why the check is NOT redundant here: "purge this card": one use, one tactical action.
  test('relic:dominusorb is purged by its use and covers one tactical action only', () => {
    const later = using(tactical(TARGET, { moves: [{ from: NEAR, units: { destroyer: 1 } }] }), id);
    const orb = table([activateHome(), using(leaveHome(), id), tactical(NEAR), later]);
    expect(endOf(orb).holdings.relics).not.toContain(id);
    const warnings = warningsOf(orb, later);
    expectStanding(warnings, 'sourceActivated');
    expectStanding(warnings, 'componentNotHeld');
  });

  test.fails('relic:dominusorb is a play effect that waives the move out of a system with my token', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => [w.code, w.lasts])).toEqual([['sourceActivated', undefined]]);
  });
});
