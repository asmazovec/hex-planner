/**
 * Jae Mir Kan (Mahact, agent):
 * When you would spend a command token during the secondary ability of a strategic action: You may exhaust this
 * card to remove 1 of the active player's command tokens from the board and use it instead.
 *
 * A play, red in pass 1: named in `uses` of a secondary, the agent is exhausted (already) and the strategy token of the
 * secondary is not spent: the active player's token is used instead.
 * Decided (pass 2): a `modify` of `strategyCost` held for the entry that names the agent while it is ready: the secondary
 * owes none of my strategy tokens (the cost is 0, so no `shortStrategy` is made either). An exhausted agent is not
 * ready, so a second secondary pays its token again. The token removed from the active player is not modelled: the
 * secondary entry does not know who the active player is.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:mahactagent';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  modify: { strategyCost: (value, ctx) => (ctx.secondary ? 0 : value) },
  holder: 'self',
};
