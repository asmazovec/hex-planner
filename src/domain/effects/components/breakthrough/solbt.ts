/**
 * Bellum Gloriosum (Federation of Sol, breakthrough): "When you produce a ship that has capacity, you may also
 * produce any combination of ground forces or fighters up to that ship's capacity; they do not count against your
 * PRODUCTION limit."
 *
 * Pass 1: a hint. Decided: `passive` waiver of `productionOver`, narrowed with `when`: the fighters and ground forces of the
 * production up to the combined capacity of the ships produced with them are not counted (Sol notes, Bellum Gloriosum 1);
 * the rest must fit the PRODUCTION limit.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:solbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
