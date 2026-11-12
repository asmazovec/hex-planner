/**
 * Lazax Survivors, a hazardous exploration card with an "attach" header: "This planet's resource value is increased by
 * 1 and its influence value is increased by 2."
 *
 * Decided: a `modify` of `planetResources` and of `planetInfluence` for the one planet the card is attached to (LRR
 * 35.8; it stays with the planet whoever controls it, 12.2). Nothing is waived.
 *
 * Pass 1: still the hint it is today; the attachment, the points asked by the payment and the modify come in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:ls';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
