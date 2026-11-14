/**
 * Repeal Law (action card, Action): "Discard 1 law from play."
 *
 * Pass 2 makes it a `play` with the choice `law`: that law leaves play for the whole game, as a law in `spends`
 * already does. Without a law in play the card cannot be resolved (tirules2 ruling 1): `componentUnresolved` (2.6.1).
 * Written in pass 2.
 */
import { lawDiscarded } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { unresolvedBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:repeal';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'law', kind: 'component', options: ({ shared }) => [...(shared.laws ?? [])] }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (ctx.choices.law === undefined) return [];
    const law = String(ctx.choices.law);
    // tirules2, Repeal Law 1: a law must be in play.
    if (!ctx.board.common.laws.some(held => held.id === law)) { unresolvedBy(ctx, 'the law is not in play'); return []; }
    return [lawDiscarded(law)];
  },
};
