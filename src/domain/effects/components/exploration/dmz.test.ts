import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, endOf, expectNone, expectStanding, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './dmz';

/** The check pass 2 adds for a planet with the card attached: units landed, produced or placed on it. */
const DEMILITARIZED = 'planetDemilitarized' as AnyWarningCode;

/** My carrier in the target system with two infantry; each landing puts infantry on Target One. */
const land = (infantry: number) => tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry } }] });
const table = (rounds: Entry[][]) => bench({ faction: 'sol', expansions: ['pok'], units: { [TARGET]: { carrier: 1, infantry: 2 } }, rounds });

describe('exploration:dmz Demilitarized Zone', () => {
  // "Then, return all ground forces on this planet to the space area. Attach: ..."
  // Checks: two infantry take Target One, which is explored with this card: they go back up to the space area, the
  // planet stays mine (12.2) and has the card attached (35.8).
  // Why nothing is waived here: the card moves units and attaches itself; it lifts no check.
  test('exploration:dmz the ground forces return to space, the planet stays controlled, the card is attached', () => {
    const dmz = table([[using(land(2), id)]]);
    quote(dmz.pack, id, 'return all ground forces on this planet to the space area');
    const end = endOf(dmz);
    expect(end.ground.t1 ?? {}).toEqual({});
    expect(end.systems[TARGET]).toMatchObject({ infantry: 2 });
    expect(end.control.t1).toBe('me');
    expect(end.attachments?.t1).toContain(id);
  });

  // "Attach: Units cannot be committed to, produced on, or placed on this planet."
  // Checks: in round 2 an infantry lands on the demilitarized planet; it is warned of with a new code, and lands all
  // the same, as a warning forbids nothing.
  // Why the check is NOT redundant here: the card adds a prohibition the rules do not have; nothing of this player lifts it.
  test('exploration:dmz a later landing on the planet is warned of', () => {
    const again = land(1);
    expectStanding(warningsOf(table([[using(land(2), id)], [again]]), again), DEMILITARIZED);
  });

  // Checks: without the card a second landing on Target One is not warned of.
  // Why the check is NOT made here: no card is attached to the planet.
  test('exploration:dmz without the card a later landing is not warned of', () => {
    const again = land(1);
    expectNone(warningsOf(table([[land(1)], [again]]), again), DEMILITARIZED);
  });

  test.todo('exploration:dmz the planet card traded in the agenda phase: the plan has no agenda phase');
});
