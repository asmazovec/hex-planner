/**
 * Research Team: Biotic (agenda):
 * "Attach this card to the elected planet's card. When the owner of this planet researches technology, they may
 * exhaust this card to ignore 1 green prerequisite."
 *
 * A law attached to the elected planet. Its owner may exhaust it to ignore 1 green prerequisite: a
 * waiver of the prerequisite check (90.12, a new code `prerequisiteMissing`), held by the entry that names the card in
 * its `uses` (exhausting it, as its text says), narrowed to one missing biotic prerequisite and to the player who
 * controls the elected planet. Pass 1: still the hint it is today.
 */
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import { card } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:rt_biotic';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  // "Exhaust this card": the replay exhausts only what a kind of component has a rule for, so the card does it here;
  // a second use before the status phase readies it is then warned of as an exhausted component.
  play: ctx => (ctx.my.holds(ctx.id) ? [card.exhaust(ctx.holder, ctx.id)] : [{ type: 'CardGained', player: ctx.holder, card: ctx.id, state: 'exhausted' }]),
  permit: [{
    code: prerequisitesMissing.code,
    rule: 'When the owner of this planet researches technology, they may exhaust this card to ignore 1 green prerequisite.',
    // One biotic symbol is all that is missing, and the entry's player controls the planet the card is attached to.
    when: (warning, ctx) => Number(warning.params.missing) === 1 && String(warning.params.symbols) === 'biotic ×1'
      && ctx.had.planets().some(planet => planet.attached.includes(id)),
  }],
};
