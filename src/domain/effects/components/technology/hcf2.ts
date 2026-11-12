/**
 * Hybrid Crystal Fighter II (Naalu Collective, fighter upgrade): "This unit may move without being transported.
 * Fighters in excess of your ships' capacity count as 1/2 of a ship against your fleet pool."
 *
 * A unit upgrade: its generated numbers (move 2) already let the fighters fly, so they are no load (the capacity check
 * counts fighters without a move value only) and the excess counts against the fleet pool (`fleetCount`), as Fighter II
 * has it. This card halves that excess: a `modify` of a new point of the count (the fighters beyond capacity that the
 * fleet pool counts), so two excess fighters weigh as one ship and the warning names the halved number.
 *
 * Pass 1: passive without its own change yet (a unit upgrade's file is merged into a passive effect, so it cannot be
 * written as a hint); the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:hcf2';

/** The rule of the generated unit upgrade (LRR 97.4) stays: the merged effect keeps the file's `rule`. */
export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
