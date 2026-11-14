/**
 * Signal Jamming (action card, Action): "Choose 1 non-home system that contains or is adjacent to 1 of your ships.
 * Place a command token from another player's reinforcements in that system."
 *
 * A `play` of a component action with the choices `systemId` and `player`: that player's command token comes from
 * their reinforcements into the system (their pools do not change). The card's own condition (a non-home system that
 * contains or is adjacent to one of my ships) is warned of when it is not met.
 */
import { commandToken } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { shipsOf, unmetBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:jamming';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'systemId', kind: 'system' },
    { key: 'player', kind: 'player' },
  ],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const slot = ctx.choices.systemId === undefined ? undefined : String(ctx.choices.systemId);
    if (slot === undefined) return [];
    const near = shipsOf(ctx, ctx.holder, slot) > 0 || ctx.adjacent(slot).some(next => shipsOf(ctx, ctx.holder, next) > 0);
    if (ctx.tileKind(slot) === 'home' || !near) unmetBy(ctx);
    const target = ctx.playerOf(String(ctx.choices.player));
    return target !== undefined && target !== ctx.holder && !ctx.board.systems[slot]?.tokens.includes(target) ? [commandToken.place(target, slot)] : [];
  },
};
