import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './thalnos';

describe('relic:thalnos The Crown of Thalnos', () => {
  // "During each combat round, this card's owner may reroll any number of their dice, applying +1 to the results, any
  //  units that reroll dice but do not produce at least 1 hit are destroyed."
  // Checks: the relic is a reminder in the combat block.
  // Why the check is redundant here: nothing is validated: the plan rolls no dice, so a reroll and its +1 change no
  // number it counts; the units the relic destroys are entered by the player as the losses of the battle.
  test('relic:thalnos is a hint of the combat step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'reroll any number of their dice, applying +1 to the results');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });
});
