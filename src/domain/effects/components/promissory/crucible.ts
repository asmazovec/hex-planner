/**
 * Crucible (Vuil'raith Cabal, promissory note): "After you activate a system: Your ships do not roll for gravity
 * rifts during this movement, apply an additional +1 to the move values of your ships that would move out of or
 * through a gravity rift instead. Then, return this card to the Vuil'raith player."
 *
 * Decided: a waiver of `speedShort` for the entry that names it in `uses`, narrowed to the ships whose path leaves or
 * crosses a gravity rift and which fall short by no more than 1 (the +1 does not grow with more rifts, Crucible note
 * 2). A played card cannot change a number (`modify` is passive), so the shortfall it covers is lifted instead. The
 * rolls are not simulated; the return to its owner is done by the replay (69.3). */
import { crossesRift, oneShipShort } from '../../helpers/movement';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:crucible';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  waive: [{
    code: 'speedShort',
    rule: 'apply an additional +1 to the move values of your ships that would move out of or through a gravity rift',
    // The +1 is one step and does not grow with more rifts: a ship short by one, on a route that leaves or crosses a rift.
    when: (warning, ctx) => crossesRift(warning, ctx) && oneShipShort(warning, ctx, 1),
  }],
};
