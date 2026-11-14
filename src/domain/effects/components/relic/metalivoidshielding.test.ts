import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './metalivoidshielding';

describe('relic:metalivoidshielding Metali Void Shielding', () => {
  // "Each time hits are produced against 1 or more of your non-fighter ships, 1 of those ships may use SUSTAIN DAMAGE
  //  as if it had that ability."
  // Checks: the relic is a hint in the block of the battle.
  // Why the check is NOT redundant here: there is no check to lift. Sustain Damage decides how hits are assigned (87),
  // and the plan assigns no hits: the player enters the ships that were lost.
  test('relic:metalivoidshielding is a reminder in the block of the battle', () => {
    const relic = bench({ faction: 'sol', expansions: ['te'], start: { relics: [id] } });
    quote(relic.pack, id, 'may use SUSTAIN DAMAGE as if it had that ability');
    expect(effect(relic.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(hintsAt(relic.pack, endOf(relic), 'combat', ['me']).map(c => c.id)).toContain(id);
  });
});
