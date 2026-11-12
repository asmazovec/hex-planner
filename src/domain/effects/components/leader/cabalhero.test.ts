import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectStanding, quote, warningsOf } from '../kit';
import { id } from './cabalhero';

const cabal = (entries: ReturnType<typeof componentAction>[]) =>
  bench({ faction: 'cabal', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:cabalhero It Feeds on Carrion', () => {
  // "ACTION: Each other player rolls a die for each of his non-fighter ships that are in or adjacent to a system that
  //  contains a dimensional tear. on a 1-3, capture that unit."
  // Checks: the hero is a reminder of the component action.
  // Why nothing is validated here: the dice are other players' and the captured units are not kept by the plan.
  test('leader:cabalhero is a hint of the component action', () => {
    const { pack } = cabal([]);
    quote(pack, id, 'on a 1-3, capture that unit');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // "Then, purge this card." LRR 51.12: a hero is purged after its ability is resolved.
  // Checks: the replay purges the hero by its action, so a second play is warned of.
  // Why the check is NOT redundant here: the card is gone after its one use.
  test('leader:cabalhero is purged by its action', () => {
    const again = componentAction(id);
    const table = cabal([componentAction(id), again]);
    expectStanding(warningsOf(table, again), 'componentNotHeld');
  });

  test.todo('leader:cabalhero captures the ships rolled for: dice and captured units are not modelled');
});
