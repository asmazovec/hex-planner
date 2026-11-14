/**
 * Tomb of Emphidia, a cultural exploration card with an "attach" header: "This planet's influence value is increased by
 * 1. If the player who has the "Crown of Emphidia" relic has control of this planet, they can use that relic to gain 1 VP."
 *
 * Decided: mixed. The first sentence is a `modify` of `planetInfluence` for the planet the card is attached to (LRR
 * 35.8, 12.2). The second sentence is the relic's own ability (Crown of Emphidia, another batch): it is played by the
 * relic, and the tomb only names the planet it asks for, so here it stays a reminder.
 *
 * Pass 1: still the hint it is today; the attachment, the point asked by the payment and the modify come in pass 2.
 */
import { attachExplored } from './batch33/attach';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'exploration:toe';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'passive', rule: id,
  modify: { planetInfluence: value => value + 1 },
  holder: 'anyone',
  on: {
    gained: attachExplored,
  },
};
