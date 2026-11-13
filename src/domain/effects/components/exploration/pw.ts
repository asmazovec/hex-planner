/**
 * Paradise World, a cultural exploration card with an "attach" header: "This planet's influence value is increased by 2."
 *
 * Decided: a `modify` of `planetInfluence` for the one planet the card is attached to (LRR 35.8; it stays with the planet
 * whoever controls it, 12.2). The plan enters it in «Taken and discarded» of the entry that gains the planet. Nothing is
 * waived: the planet simply has two more influence.
 *
 * Pass 1: still the hint it is today; the attachment, the point asked by the payment and the modify come in pass 2.
 */
import type { ComponentEffect } from '../../types';
import { attachExplored } from './batch33/attach';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'exploration:pw';

export const effect: ComponentEffect = {
  tier: 'passive', rule: id,
  modify: { planetInfluence: value => value + 2 },
};

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Hooked = {
  holder: 'anyone',
  on: {
    gained: attachExplored,
  },
};
