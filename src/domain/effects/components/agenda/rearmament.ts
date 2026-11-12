/**
 * Rearmament Agreement (directive): "For: Each player places 1 mech from their reinforcements on a planet they
 * control in their home system. Against: Each player replaces each of their mechs with 1 infantry from their
 * reinforcements."
 *
 * Decided: play. "For" places 1 mech on a planet of the home system the player controls; "Against" replaces each mech
 * with an infantry: both change the board the plan counts. Pass 1 keeps it a hint; the tests mark what the play must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:rearmament';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
