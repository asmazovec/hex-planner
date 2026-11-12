/**
 * Nano-Forge (relic): "ACTION: Attach this card to a non-legendary, non-home planet you control, its resource and
 * influence values are increased by 2 and it is a legendary planet. This action cannot be performed once attached."
 *
 * Decided (pass 2): play (`choices.planetId` attaches it, in the shared `attachments`) and a modify of
 * `planetResources` and `planetInfluence` (+2) of the planet it is attached to; a target that is not mine, a home planet
 * or a legendary one is warned of, and so is a second play. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:nanoforge';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
