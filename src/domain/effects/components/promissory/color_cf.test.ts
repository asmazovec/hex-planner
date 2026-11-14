import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, expectStanding, HOME, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './color_cf';

const RIVAL = { id: 'a', faction: 'letnev', vp: 0, seat: 2, color: 2 };
/** A game where I hold `mine` of the notes when the plan begins, beside one opponent. */
const table = (mine: string[], entries = [tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] })]) => ({
  entries,
  ...bench({
    faction: 'sol', units: { [HOME]: { carrier: 1 } }, entries,
    game: { opponents: [RIVAL], start: { me: { promissory: mine }, opponents: { a: {} } } },
  }),
});

describe('promissory:<color>_cf Ceasefire', () => {
  // "After the <color> player activates a system that contains 1 or more of your units: The <color> player cannot move
  //  units to the active system."
  // Checks: the note is a reminder at the activation step, and lifts nothing.
  // Why nothing is validated: the note forbids rather than allows, and it is played by its holder as a reaction in
  // another player's action; the plan cannot know whether it will be, so a planned move is not warned of.
  test('promissory:<color>_cf is a hint at the activation step', () => {
    const { pack } = table([]);
    quote(pack, id, 'cannot move units to the active system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });

  // Checks: another player's Ceasefire that I hold stands among the reminders of the activation step.
  // Why it is shown: I may play it when that player activates a system with my units.
  test('promissory:<color>_cf another player\'s Ceasefire I hold is a reminder of the activation step', () => {
    const cf = table([`${id}@a`]);
    expect(hintsAt(cf.pack, endOf(cf), 'activation', ['me']).map(c => c.id)).toContain(`${id}@a`);
  });

  // LRR 69.2: "A player cannot play their own promissory note."
  // Checks: playing my own Ceasefire is warned of.
  // Why the check is NOT redundant here: the note only works in another player's hands.
  test('promissory:<color>_cf my own Ceasefire cannot be played', () => {
    const move = using(tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] }), `${id}@me`);
    const cf = table([`${id}@me`], [move]);
    expectStanding(warningsOf(cf, move), 'ownPromissory');
  });

  test.todo('promissory:<color>_cf played against me, my moves into the active system are warned of: the plan does not know when another player plays a reaction in my action');
});
