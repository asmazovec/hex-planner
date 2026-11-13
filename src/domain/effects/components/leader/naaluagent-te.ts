/**
 * Z'eu (Naalu Collective, agent, Thunder's Edge): "After any player's command token is placed in a system: You may
 * exhaust this card to return that token to that player's reinforcements."
 *
 * A hint at the activation: a reaction to anyone's activation, most often another player's, whose turn the plan does
 * not own. Nothing is lifted: the token returned leaves the board of that player, it breaks no check of mine.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:naaluagent-te';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['activation'] };
