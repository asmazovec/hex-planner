/**
 * Deepgloom Executable (Yssaril, breakthrough): "You can allow other players to use your STALL TACTICS or SCHEMING
 * faction abilities; when you do, you may resolve a transaction with that player. During the action phase, that
 * transaction does not count against the once-per-player transaction limit for that turn."
 *
 * Decided: a waiver of `transactionRepeated` (94.1) and of `notNeighbor` (Yssaril notes, Deepgloom Executable 1: the
 * transaction needs no neighbours) for the entry of another player that names the breakthrough in `uses` together
 * with Stall Tactics or Scheming ("when you do" ties the transaction to their use). The warnings are still made and
 * listed, lifted by the card. The Yssaril's own turn is not covered: the card speaks of other players.
 */
import type { Ability } from '../../../../game/abilities/types';
import type { Permit } from '../../../../game/abilities/types';

export const id = 'breakthrough:yssarilbt';

/** The entry is another player's and uses one of the two abilities the card lends. */
const lent: Permit['when'] = (_warning, ctx) =>
  ctx.actor !== ctx.table.viewer && (ctx.entry?.uses ?? []).some(used => used === 'ability:stall_tactics' || used === 'ability:scheming');

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  permit: [
    { code: 'transactionRepeated', rule: 'During the action phase, that transaction does not count against the once-per-player transaction limit for that turn.', when: lent },
    { code: 'notNeighbor', rule: 'The Yssaril player may perform a transaction with another player without being neighbors with that player.', when: lent },
  ],
};
