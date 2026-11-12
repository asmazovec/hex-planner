/**
 * "Once per action, when you resolve a unit's PRODUCTION ability, you may resolve another of your unit's
 * PRODUCTION abilities in any system."
 *
 * Pass 1: a hint. Pass 2: play; a second PRODUCTION in any system once per action. A tactical entry produces in
 * its active system only, so this needs a new field of the entry (a production elsewhere).
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:asn';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
