/**
 * Political Favor (Xxcha, promissory note): "When an agenda is revealed: Remove 1 token from the Xxcha player's
 * strategy pool and return it to their reinforcements. Then, discard the revealed agenda and reveal 1 agenda from the
 * top of the deck. Players vote on this agenda instead. Then, return this card to the Xxcha player."
 *
 * Decided: a `play`: the one count it changes is the token taken from the strategy pool of the player whose address
 * the note bears (`promissory:favor@<player>`), which is another player than the one who plays it. Agendas and votes are
 * not planned, so the rest stays text. A pool with no token left loses none (nothing is warned of: the card says
 * "remove", and the player may have none).
 */
import { noteAddress } from '../../../components';
import { tokens } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:favor';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const key = noteAddress(ctx.id);
    const owner = key === undefined ? undefined : ctx.playerOf(key);
    if (!ctx.held || owner === undefined || owner === ctx.holder || ctx.of(owner).pools.strategy <= 0) return [];
    return [tokens(owner, { strategy: -1 })];
  },
};
