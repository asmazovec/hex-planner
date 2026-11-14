/**
 * Warfare Rider (action card, After an agenda is revealed): "You cannot vote on this agenda. Predict aloud an outcome
 * of this agenda. If your prediction is correct, place 1 dreadnought from your reinforcements in a system that
 * contains 1 or more of your ships."
 *
 * A `play` in the agenda phase (an entry of the component kind that is not a turn): the plan does not count votes, so
 * the player enters the system (`systemId`) when the prediction came true and a dreadnought is placed there. A system
 * without my ships is warned of.
 */
import type { GameEvent, Hooked } from '../../../../game/abilities/types';
import { placeIn, shipsOf, unmetBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:war_rider';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'systemId', kind: 'system' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (ctx.choices.systemId === undefined) return [];
    const slot = String(ctx.choices.systemId);
    if (shipsOf(ctx, ctx.holder, slot) === 0) unmetBy(ctx);
    const events: GameEvent[] = [];
    placeIn(ctx, events, slot, { dreadnought: 1 });
    return events;
  },
};
