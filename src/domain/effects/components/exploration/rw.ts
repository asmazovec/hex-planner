/**
 * Rich World, a hazardous exploration card with an "attach" header: "This planet's resource value is increased by 1."
 *
 * Decided: a `modify` of `planetResources` for the one planet the card is attached to. The card is drawn when its
 * planet is explored (LRR 35.1, 35.2) and attached to that planet card (35.8); it stays with the planet when control
 * changes (12.2), so it counts for whoever controls the planet. The plan enters it in «Taken and discarded» of the
 * entry that gains the planet. Nothing is waived: the planet simply has one more resource.
 *
 * Pass 1: still the hint it is today; the attachment, the point asked by the payment and the modify come in pass 2.
 */
import type { ComponentEffect } from '../../types';
import { attachExplored } from './batch33/attach';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'exploration:rw';

export const effect: ComponentEffect = {
  tier: 'passive', rule: id,
  modify: { planetResources: value => value + 1 },
};

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Hooked = {
  holder: 'anyone',
  on: {
    gained: attachExplored,
  },
};
