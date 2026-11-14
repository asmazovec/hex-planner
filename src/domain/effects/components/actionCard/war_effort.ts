/**
 * War Effort (action card, Action): "Place 1 cruiser from your reinforcements in a system that contains 1 or more of
 * your ships."
 *
 * A `play` of a component action with the choice `systemId`: a cruiser from my reinforcements is placed there. A
 * system without my ships is warned of; the fleet pool and the capacity still limit the ships there (`place`).
 */
import type { GameEvent, Hooked } from '../../../../game/abilities/types';
import { placeIn, shipsOf, unmetBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:war_effort';

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
    placeIn(ctx, events, slot, { cruiser: 1 });
    return events;
  },
};
