/**
 * Hybrid Crystal Fighter II (Naalu Collective, fighter upgrade): "This unit may move without being transported.
 * Fighters in excess of your ships' capacity count as 1/2 of a ship against your fleet pool."
 *
 * A unit upgrade: its generated numbers (move 2) already let the fighters fly, so they are no load (the capacity check
 * counts fighters without a move value only) and the excess counts against the fleet pool, as Fighter II has it. This
 * card halves that excess: a `modify` of `excessFighters`, so two excess fighters weigh as one ship and the warning
 * names the halved number. The count rounds a half up.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:hcf2';

/** The rule of the generated unit upgrade (LRR 97.4) stays: the merged effect keeps the file's `rule`. */
export const effect: ComponentEffect = {
  tier: 'passive',
  rule: '97.4',
  modify: { excessFighters: value => value / 2 },
};
