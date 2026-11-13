/**
 * Field Marshal Mercer (Nomad, agent): "At the end of a player's turn: You may exhaust this card to allow that player
 * to remove up to 2 of their ground forces from the game board and place them on planets they control in the active
 * system."
 *
 * A hint. The ground forces moved belong to the player whose turn ends, from anywhere on the board, even a system with
 * their command token (Nomad, Field Marshal Mercer notes 1-4): the plan has no entry for units placed by another
 * player's agent at the end of a turn, so they are moved by hand. Exhausting the agent is what naming it in «Used»
 * does already (51.4).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:nomadagentmercer';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
