/**
 * Political Censure (law): "The elected player gains this card and 1 victory point. The elected player cannot play
 * action cards. If the owner of this card loses this card, they lose 1 victory point."
 *
 * Decided: mixed (play and a new check). The elected player gains 1 victory point, and loses it with the card; the
 * elected player cannot play action cards, a check the replay does not make yet (a new code). Pass 1 keeps it a hint;
 * the tests mark what it must do.
 */
import actionCardBarred from '../../../rules/codes/actionCardBarred';
import { violation } from '../../../rules/registry';
import { componentById } from '../../../components';
import { actionCardsPlayed } from '../../points/status';
import type { Ability } from '../../../../game/abilities/types';
import { gain } from '../../../../game/abilities/emit';

export const id = 'agenda:censure';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'anyone',
  on: {
    gained: ctx => [gain.points(ctx.holder, 1)],
    lost: ctx => [gain.points(ctx.holder, -1)],
    restrict: ctx => {
      if (ctx.entry === undefined) return;
      for (const card of actionCardsPlayed(ctx.entry, ctx.pack)) {
        ctx.warn(violation(actionCardBarred.code, { id: card, name: componentById(ctx.pack, card)?.name ?? card }));
      }
    },
  },
};
