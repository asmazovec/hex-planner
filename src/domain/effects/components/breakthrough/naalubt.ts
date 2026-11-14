/**
 * Mindsieve (Naalu Collective, breakthrough, Thunder's Edge): "When you would resolve the secondary ability of another
 * player's strategy card, you may give them a promissory note to resolve it without spending a command token."
 *
 * A `play` effect with a `modify` of `strategyCost` (asked for the entry that names it in `uses`): a secondary costs 0
 * strategy tokens, so the pool is untouched and `shortStrategy` is not made at all (the cost itself is gone, nothing
 * is waived). A primary played for a token is not a secondary and still costs its token; Leadership's secondary is free
 * anyway. The note given is not a transaction (Naalu, Mindsieve note 2) and is not counted yet.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:naalubt';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  modify: { strategyCost: (value, ctx) => (ctx.secondary ? 0 : value) },
  holder: 'self',
};
