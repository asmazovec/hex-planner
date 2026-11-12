/**
 * Core Mining (agenda):
 * "Attach this card to the elected planet's card. Then, destroy 1 infantry on the planet. The resource value of
 * this planet is increased by 2."
 *
 * A law attached to the elected planet (`choices.elect`): its resource value is 2 more, a `modify` of the
 * point `planetResources` for that planet, and when it is resolved one infantry on the planet is destroyed. Pass 1:
 * still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:core_mining';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
