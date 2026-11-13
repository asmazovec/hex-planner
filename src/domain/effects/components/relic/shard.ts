/**
 * Shard of the Throne (relic): "When you gain this card, gain 1 victory point, when you lose this card, lose 1 victory
 * point. When a player gains control of a legendary planet you control or a planet you control in your home system, that
 * player gains this card."
 *
 * Decided (pass 2): play on being gained and lost: the entry that gains it adds 1 victory point, the entry that loses it
 * takes 1 away. Held when the plan begins, its point is already in the starting points. The transfer to a player who
 * takes such a planet is not replayed. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';
import { gain } from '../../../../game/abilities/emit';

export const id = 'relic:shard';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
};

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Hooked = {
  holder: 'anyone',
  on: {
    gained: ctx => [gain.points(ctx.holder, 1)],
    lost: ctx => [gain.points(ctx.holder, -1)],
  },
};
