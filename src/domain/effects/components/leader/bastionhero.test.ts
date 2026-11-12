import { describe, expect, test } from 'vitest';
import { bench, effect, expectStanding, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './bastionhero';

describe('leader:bastionhero Lyra Keen', () => {
  // "You may purge this card to roll 1 die for each unit in its system that belongs to another player"
  // Checks: the hero is a reminder of the battle in space and of the invasion.
  // Why nothing is validated here: which units die is decided by dice, which the plan does not roll; the losses of
  // the other players are entered by hand, and no check of the replay is lifted.
  test('leader:bastionhero is a hint of the combat and the invasion steps, with no waiver', () => {
    const { pack } = bench({ faction: 'bastion', expansions: ['pok', 'te'] });
    quote(pack, id, 'You may purge this card to roll 1 die for each unit in its system that belongs to another player');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'invasion']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 51.12 with the card's "purge this card": a hero is spent by its ability.
  // Checks: named in «Used» the hero is purged, so naming it again is warned of as not held.
  // Why the check is NOT redundant here: a purged hero is out of the game; nothing of the card brings it back.
  test('leader:bastionhero used once is purged: a second use is warned of', () => {
    const first = using(tactical(NEAR), id);
    const second = using(tactical(NEAR), id);
    const table = bench({ faction: 'bastion', expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } }, entries: [first, second] });
    expectStanding(warningsOf(table, second), 'componentNotHeld');
  });
});
