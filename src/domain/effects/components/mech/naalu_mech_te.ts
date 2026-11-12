/**
 * Iconoclast (Naalu Collective, mech, Thunder's Edge): "DEPLOY: When another player gains a relic, place 1 mech on any
 * planet you control."
 *
 * A hint with no step: it answers another player's relic, which the plan does not follow; the mech placed is entered
 * by hand. Nothing it does lifts a check of the plan.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:naalu_mech_te';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
