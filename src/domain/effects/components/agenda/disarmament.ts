/**
 * Compensated Disarmament (agenda, directive): "Destroy each ground force on the elected planet. For each unit that was
 * destroyed, the player who control that planet gains 1 trade good."
 *
 * Decided: play. The ground forces on the elected planet (`choices.planet`) leave the board and the controller gains a
 * trade good for each (Compensated Disarmament notes 2 and 4: infantry and mechs count, structures are unaffected).
 * Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:disarmament';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
