/**
 * The Prophet's Tears (relic): "When you research a technology, you may exhaust this card to ignore 1 prerequisite or
 * draw 1 action card."
 *
 * Decided (pass 2): play, a waiver of a new check, the prerequisites a researched technology lacks (90.8), for the entry
 * that names it in `uses`, when one prerequisite is missing. The action card drawn instead is entered as a gain. The
 * replay already exhausts the relic. Pass 1 keeps it the hint it is today.
 */
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'relic:prophetstears';

export const ability: Ability = {
  holder: 'self',
  tier: 'play',
  rule: id,
  permit: [{
    code: prerequisitesMissing.code,
    rule: 'you may exhaust this card to ignore 1 prerequisite',
    when: (warning, ctx) => Number(warning.params.missing) <= 1 && ctx.had.holds(id),
  }],
};
