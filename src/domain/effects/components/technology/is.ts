/**
 * Inheritance Systems (L1Z1X Mindnet, faction technology): "You may exhaust this card and spend 2 resources when you
 * research a technology; ignore all of that technology's prerequisites."
 *
 * Decided: a `play` that waives a new check. Research does not check prerequisites yet (90.12); pass 2 adds that
 * check for everyone (code `researchPrerequisites`, step `card`), and this card, named in the `uses` of the
 * research, lifts it for that entry and adds 2 resources to its cost (faction note 1: paid apart from the research).
 *
 * Pass 2: a `play` that waives `prerequisitesMissing` for the entry that names it, while the card is held and ready (a
 * second use finds it exhausted and lifts nothing). The 2 resources more are not counted: `researchCost` is asked
 * without the entry's `uses` (see the report).
 */
import { componentById } from '../../../components';
import { holds, isExhausted } from '../../../replay/holdings';
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import type { ComponentEffect } from '../../types';

export const id = 'technology:is';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  waive: [{
    code: prerequisitesMissing.code,
    rule: "ignore all of that technology's prerequisites",
    when: (_warning, ctx) => {
      const def = componentById(ctx.pack, id);
      return !def || (holds(ctx.before.holdings, def) && !isExhausted(ctx.before.holdings, def));
    },
  }],
};
