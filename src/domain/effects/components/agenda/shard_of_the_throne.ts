/**
 * Shard of the Throne (agenda):
 * "The elected player gains this card and 1 victory point. A player gains this card and 1 victory point when they
 * win a combat against the owner of this card. Then, the previous owner of this card loses 1 victory point."
 *
 * A law of the elected player: they gain the card and 1 victory point when it is resolved (a `play`
 * of the agenda entry with `choices.elect`). Who wins a combat is not counted, so the passing of the card is a hint at
 * the combat. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';
import { gain } from '../../../../game/abilities/emit';

export const id = 'agenda:shard_of_the_throne';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Hooked = {
  holder: 'anyone',
  on: {
    // "The elected player gains this card and 1 victory point": once, when the law is resolved. The passing of the card
    // to the winner of a combat is not modelled (who wins is not in the plan).
    gained: ctx => {
      const who = ctx.playerOf(String(ctx.choices.elect ?? ctx.key(ctx.holder)));
      return who === undefined ? undefined : [gain.points(who, 1)];
    },
    // "... the previous owner of this card loses 1 victory point": a law taken out of play by an entry of its owner.
    lost: ctx => [gain.points(ctx.holder, -1)],
  },
};
