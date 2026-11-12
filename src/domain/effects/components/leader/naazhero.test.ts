import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './naazhero';

const hero = (entries: ReturnType<typeof componentAction>[]) =>
  bench({ faction: 'naaz', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:naazhero Hesh and Prit — Perfect Synthesis', () => {
  // "ACTION: Gain 1 relic and perform the secondary ability of up to 2 readied or unchosen strategy cards."
  // Checks: the hero is a reminder at the component step and lifts nothing.
  // Why nothing is validated here: the relic is entered with the action, and the two secondary abilities performed
  // within it are not modelled (a secondary is an entry of its own).
  test('leader:naazhero is a hint at the component step', () => {
    const { pack } = hero([]);
    quote(pack, id, 'perform the secondary ability of up to 2 readied or unchosen strategy cards');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['component'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // "Gain 1 relic ... Then, purge this card."
  // Checks: the component action gains the relic entered with it and purges the hero; a second play is warned of.
  // Why the check is NOT redundant here: a hero is played once (51.12).
  test('leader:naazhero the action gains its relic and purges the hero', () => {
    const play = componentAction(id, { gains: ['relic:obsidian'] });
    const again = componentAction(id);
    const table = hero([play, again]);
    expect(endOf(table).holdings.relics).toContain('relic:obsidian');
    expect(endOf(table).holdings.leaders[id]).toBe('purged');
    expectStanding(warningsOf(table, again), 'componentNotHeld');
  });

  test.todo('leader:naazhero the secondary abilities of two strategy cards within this action, paid from the reinforcements: a secondary is an entry of its own, a turn apart');
});
