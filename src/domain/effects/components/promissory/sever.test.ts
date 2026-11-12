import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectStanding, quote, warningsOf } from '../kit';
import { id } from './sever';

const table = (faction: string, note: string) => {
  const play = componentAction(note);
  return { play, ...bench({ faction, expansions: ['te'], start: { promissory: [note] }, entries: [play], game: { opponents: [{ id: 'o1', faction: 'crimson', vp: 0, seat: 2, color: 2 }] } }) };
};

describe('promissory:sever Sever', () => {
  // "... place the sever token in a system that contains your units, wormholes in that system have no effect during
  //  movement."
  // Checks: the note is a reminder in the block of movement.
  // Why nothing is validated: the note restricts the movement of every player instead of lifting a check, and a step
  // through a wormhole that joins nothing would be entered as a jump, which the plan does not warn of.
  test('promissory:sever is a reminder of movement', () => {
    const { pack } = table('sol', `${id}@o1`);
    quote(pack, id, 'wormholes in that system have no effect during movement');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['movement']);
  });

  // LRR 69.2: a player cannot play their own promissory note.
  // Checks: the Rebellion player playing their own Sever is warned of.
  // Why the check is NOT redundant here: the note is the Rebellion's gift to others.
  test('promissory:sever the Rebellion player cannot play their own note', () => {
    const crimson = table('crimson', `${id}@me`);
    expectStanding(warningsOf(crimson, crimson.play), 'ownPromissory');
  });

  test.todo('promissory:sever a route through a wormhole of the severed system is warned of until the end of the status phase: the plan does not warn of a jump, and a component cannot add a restriction');
});
