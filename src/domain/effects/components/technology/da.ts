/**
 * Duranium Armor (technology, base game): "During each combat round, after you assign hits to your units, repair 1 of
 * your damaged units that did not use SUSTAIN DAMAGE during this combat round."
 *
 * A hint: damage and its repair belong to the combat, which the plan does not fight; it stands in the battle in space
 * and in the ground combat of the invasion.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:da';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
