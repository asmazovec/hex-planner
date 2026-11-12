/**
 * Propulsion Research Facility, an industrial exploration card with an "attach" header: "This planet has a blue technology specialty. If this planet already
 * has a technology specialty, this planet's resource and influence values are each increased by 1 instead."
 *
 * Decided: a `modify` of the planet it is attached to (LRR 35.8, 12.2). On a planet without a specialty it gives the
 * propulsion specialty, which the plan asks where a specialty is spent: the technology part of a Thunder's Edge expedition
 * (expedition 4.5). Prerequisites are not checked by the plan (LRR 90.12), so the specialty skips nothing there. On a
 * planet that has a specialty it raises `planetResources` and `planetInfluence` by 1 instead. Nothing is waived.
 *
 * Pass 1: still the hint it is today; the attachment, the specialty and the points asked come in pass 2.
 */
import type { ComponentEffect } from '../../types';
import { attachExplored } from './batch33/attach';

export const id = 'exploration:propulsion';

/**
 * Pass 2: the card is attached to the planet it was explored with (`gained`). Its numbers stay a hint: the count of
 * `planetResources` and `planetInfluence` is not told the printed specialty of the planet, so "if this planet already
 * has a specialty, +1 instead" cannot be decided in a `modify`; and the expedition's payable planets (`techSlicePlanets`)
 * do not read attachments.
 */
export const effect: ComponentEffect = { tier: 'hint', rule: id, gained: attachExplored };
