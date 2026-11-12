/**
 * Mining World, a hazardous exploration card with an "attach" header: "This planet's resource value is increased by 2."
 *
 * Decided: a `modify` of `planetResources` for the one planet the card is attached to (LRR 35.8, 12.2). The resources
 * of a planet are what a payment spends and what a space dock's Production value is counted from, so both points must
 * ask the attachment. Nothing is waived.
 *
 * Pass 1: still the hint it is today; the attachment, the points asked and the modify come in pass 2.
 */
import type { ComponentEffect } from '../../types';
import { attachExplored } from './batch33/attach';

export const id = 'exploration:mw';

export const effect: ComponentEffect = {
  tier: 'passive', rule: id,
  gained: attachExplored,
  modify: { planetResources: value => value + 2 },
};
