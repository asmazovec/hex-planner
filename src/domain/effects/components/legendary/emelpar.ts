/**
 * The Acropolis (Emelpar, Thunder's Edge): "You may exhaust this card at the end of your turn to ready another
 * component that isn't a strategy card."
 *
 * Decided: `play`. Named in the `uses` of an entry with the choice `ready` (a component of the owner that is
 * exhausted), it readies that component after the entry: an agent is unlocked again, a breakthrough held, any other
 * card taken off `exhausted`. Never itself ("another"): the card the replay exhausted for this use stays exhausted.
 * The `play` also checks LRR 53.3 with 53.2: the card lies in the play area of whoever controls Emelpar.
 *
 * Not modelled: a component in another player's play area (Acropolis note 1); the plan readies the owner's holdings only.
 */
import { card } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { componentById } from '../../../components';
import { requireControlBy } from '../../helpers/cardPlay';

export const id = 'legendary:emelpar';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'ready',
    kind: 'component',
    label: { ru: 'Подготовить с The Acropolis', en: 'Ready with The Acropolis' },
    options: ctx => ctx.my.cards().filter(held => held.state === 'exhausted' && held.id !== id && componentById(ctx.pack, held.id) !== undefined).map(held => held.id),
    
  }],
  holder: 'self',
  play: ctx => {
    requireControlBy(ctx, 'emelpar');
    const ready = typeof ctx.choices.ready === 'string' ? ctx.choices.ready : undefined;
    const def = ready === undefined ? undefined : componentById(ctx.pack, ready);
    if (ready === undefined || def === undefined || ready === id) return [];
    // Only an exhausted component is readied (the board does the same); a card not held does nothing.
    return ctx.my.card(ready) === 'exhausted' ? [card.ready(ctx.holder, ready)] : [];
  },
};
