import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './keleresheroharka';

const keleres = (entries: ReturnType<typeof componentAction>[]) =>
  bench({ faction: 'keleresm', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:keleresheroharka Harka Leeds', () => {
  // "ACTION: Reveal cards from the action card deck until you reveal 3 action cards that have component actions.
  //  Draw those cards and shuffle the rest back into the action card deck."
  // Checks: the hero is a reminder of the component action's block.
  // Why the check is NOT redundant here: nothing is validated, because which three cards come out of the deck is not
  // known when the plan is made; the player enters them as gains of the component action.
  test('leader:keleresheroharka is a hint at the component action: the cards drawn are entered by hand', () => {
    const { pack } = keleres([]);
    quote(pack, id, 'Reveal cards from the action card deck until you reveal 3 action cards that have component actions');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // "Then, purge this card." LRR 51.12.
  // Checks: the component action purges the hero, and a second play is warned of as a component no longer held.
  // Why the check is NOT redundant here: the purge is the common rule of heroes, which the hero does not change.
  test('leader:keleresheroharka is purged by its component action', () => {
    const again = componentAction(id);
    const table = keleres([componentAction(id), again]);
    expect(endOf(table).holdings.leaders[id]).toBe('purged');
    expectStanding(warningsOf(table, again), 'componentNotHeld');
  });
});
