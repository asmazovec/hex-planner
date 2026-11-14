/**
 * Mining World, a hazardous exploration card with an "attach" header: "This planet's resource value is increased by 2."
 *
 * Decided: a `modify` of `planetResources` for the one planet the card is attached to (LRR 35.8, 12.2). The resources
 * of a planet are what a payment spends and what a space dock's Production value is counted from, so both points must
 * ask the attachment. Nothing is waived.
 *
 * Pass 1: still the hint it is today; the attachment, the points asked and the modify come in pass 2.
 */
import { attachExplored } from './batch33/attach';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'exploration:mw';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'passive', rule: id,
  modify: { planetResources: value => value + 2 },
  holder: 'anyone',
  on: {
    gained: attachExplored,
  },
};
