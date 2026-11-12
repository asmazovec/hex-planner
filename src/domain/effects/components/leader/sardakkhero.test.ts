import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectStanding, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './sardakkhero';

/** Two cruisers carry two infantry to the target and land them on t1. */
const invade = (): Entry => tactical(TARGET, {
  moves: [{ from: HOME, units: { cruiser: 2, infantry: 2 }, via: [NEAR] }], landings: [{ planetId: 't1', units: { infantry: 2 } }],
});
const sardakk = (entries: Entry[], faction = 'sardakk') =>
  bench({ faction, expansions: ['pok'], units: { [HOME]: { cruiser: 2, infantry: 2 } }, start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:sardakkhero Sh\'val, Harbinger', () => {
  // "If you do, after you commit ground forces to land on planets, purge this card and return each of your ships in
  //  the active system to your reinforcements."
  // Checks: used in the action, the infantry lands on t1 and both cruisers leave the board: none stands in the target.
  // Why nothing is waived here: the card skips steps the plan does not simulate (space cannon, space combat,
  // bombardment: tirules2, Sardakk N'orr, Tekklar Conditioning 2) and then changes the board, which the plan counts.
  test.fails('leader:sardakkhero used in a tactical action returns the ships of the active system after the landing', () => {
    const move = using(invade(), id);
    const end = endOf(sardakk([move]));
    expect(end.ground.t1).toEqual({ infantry: 2 });
    expect(end.systems[TARGET]?.cruiser ?? 0).toBe(0);
  });

  // Checks: without the hero the cruisers stay in the target.
  // Why the play does NOT apply here: the hero acts only when named in the entry.
  test('leader:sardakkhero not used: the ships stay in the active system', () => {
    const table = sardakk([invade()]);
    quote(table.pack, id, 'return each of your ships in the active system to your reinforcements');
    expect(endOf(table).systems[TARGET]?.cruiser).toBe(2);
  });

  // Checks: the ships the player has in other systems stay where they are.
  // Why the play does NOT apply there: the card returns the ships "in the active system" only.
  test.fails('leader:sardakkhero returns only the ships of the active system', () => {
    const move = using(tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1, infantry: 1 }, via: [NEAR] }], landings: [{ planetId: 't1', units: { infantry: 1 } }] }), id);
    const end = endOf(sardakk([move]));
    expect(end.systems[HOME]?.cruiser).toBe(1);
    expect(end.systems[TARGET]?.cruiser ?? 0).toBe(0);
  });

  // "... purge this card ..."
  // Checks: the hero is purged by its use; a second use is warned of.
  // Why the check is NOT redundant here: a purged hero is no longer held (51.12).
  test('leader:sardakkhero is purged by its use: a second use is warned of', () => {
    const again = using(tactical(HOME, { moves: [{ from: TARGET, units: { cruiser: 1 } }] }), id);
    expectStanding(warningsOf(sardakk([using(invade(), id), again]), again), 'componentNotHeld');
  });

  test.fails('leader:sardakkhero is a play effect', () => {
    const { pack } = sardakk([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
