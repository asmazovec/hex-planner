/**
 * Skilled Retreat (action card, At the start of a combat round): "Move all of your ships from the active system into
 * an adjacent system that does not contain another player's ships. The space combat ends in a draw. Then, place a
 * command token from your reinforcements in that system."
 *
 * A `play` in a window of a combat (an entry of the component kind that is not a turn) with the choices `from` and
 * `to`: all my ships of the active system move into the adjacent system and my command token from the reinforcements
 * is placed there. The card's own condition (adjacent, no other player's ships) is warned of when it is not met. Pass
 * 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:s_retreat1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
