/**
 * Emergency Repairs (action card; "At the start or end of a combat round"): "Repair all of your units that have
 * SUSTAIN DAMAGE in the active system."
 *
 * A hint in the combat block: the plan keeps no damaged state of units, so there is nothing to repair in the count.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:emergency';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
