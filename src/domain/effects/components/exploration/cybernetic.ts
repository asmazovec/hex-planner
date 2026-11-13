/**
 * Cybernetic Research Facility, an industrial exploration card with an "attach" header: "This planet has a yellow technology specialty. If this planet already
 * has a technology specialty, this planet's resource and influence values are each increased by 1 instead."
 *
 * Decided: a `modify` of the planet it is attached to (LRR 35.8, 12.2). On a planet without a specialty it gives the
 * cybernetic specialty, which the plan asks where a specialty is spent: the technology part of a Thunder's Edge expedition
 * (expedition 4.5). Prerequisites are not checked by the plan (LRR 90.12), so the specialty skips nothing there. On a
 * planet that has a specialty it raises `planetResources` and `planetInfluence` by 1 instead. Nothing is waived.
 *
 */
import { facilityAbility, facilityEffect } from './batch33/facility';

export const id = 'exploration:cybernetic';

/**
 * Pass 2: attached to the planet it was explored with (`gained`); the specialty it gives is read where a specialty is
 * spent (`specialtiesOf`), and on a planet that has one the card raises resources and influence by 1 instead (`modify`,
 * asked with the pack in its context).
 */
export const effect = facilityEffect(id);
export const ability = facilityAbility;
