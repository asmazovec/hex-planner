/**
 * The Crown of Emphidia (agenda):
 * "The elected player gains this card and 1 victory point. A player gains this card and 1 victory point after they
 * gain control of a planet in the home system of this card's owner. Then, the previous owner of this card loses 1
 * victory point."
 *
 * A law of the elected player: they gain the card and 1 victory point when it is resolved (a `play`
 * of the agenda entry with `choices.elect`). Its passing when a player takes a planet of the owner's home system is
 * not modelled: the plan does not track who holds the card after it is resolved. Pass 1: still the hint it is today.
 */
import type { Ability } from '../../../../game/abilities/types';
import { gain } from '../../../../game/abilities/emit';

export const id = 'agenda:crown_of_emphidia';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'anyone',
  on: {
    // "The elected player gains this card and 1 victory point": once, when the law is resolved. Its passing after a
    // planet of the owner's home system is taken is not modelled.
    gained: ctx => {
      const who = ctx.playerOf(String(ctx.choices.elect ?? ctx.key(ctx.holder)));
      return who === undefined ? undefined : [gain.points(who, 1)];
    },
    // "... the previous owner of this card loses 1 victory point": a law taken out of play by an entry of its owner.
    lost: ctx => [gain.points(ctx.holder, -1)],
  },
};
