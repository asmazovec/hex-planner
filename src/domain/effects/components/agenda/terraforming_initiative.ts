/**
 * Terraforming Initiative (agenda):
 * "Attach this card to the elected planet's card. The resource and influence values of this planet are increased
 * by 1."
 *
 * A law attached to the elected planet: its resource and influence values are 1 more, a `modify` of
 * the points `planetResources` and `planetInfluence` for that planet. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:terraforming_initiative';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
