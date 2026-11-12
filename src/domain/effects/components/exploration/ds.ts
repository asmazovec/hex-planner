/**
 * Dyson Sphere (cultural exploration, Prophecy of Kings): "This planet's resource value is increased by 2 and its
 * influence value is increased by 1."
 *
 * Decided: `play` that attaches, then a change of numbers. Played in the `uses` of the tactical action whose landing
 * takes control of the planet, it is attached to that planet (`attachments`, 35.8, 12.2: it stays with the planet
 * whoever controls it). The planet's values are then two resources and one influence higher wherever the count asks
 * them (`planetResources`, `planetInfluence`): a payment, a dock's Production, Hoard Raw Materials. Pass 1: the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:ds';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
