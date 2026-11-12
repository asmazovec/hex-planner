/**
 * Arms Reduction (agenda, directive): "For: Each player destroys all but 2 of their dreadnoughts and all but 4 of
 * their cruisers. Against: At the start of the next strategy phase, each player exhausts each of their planets that
 * have a technology specialty."
 *
 * Decided: play. The "For" outcome changes the board the plan counts: an agenda entry that resolves it (gains the
 * directive) destroys the dreadnoughts beyond 2 and the cruisers beyond 4. Which ones stay is the player's choice when
 * they stand in more than one system, and that choice has no field yet. "Against" exhausts planets at a later phase
 * and is not modelled.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:arms_reduction';

/** Keeps the first `keep` units of a type over the systems in order and destroys the rest. */
function trim(systems: Record<string, Record<string, number | undefined>>, unit: string, keep: number): void {
  let left = keep;
  for (const counts of Object.values(systems)) {
    const have = counts[unit] ?? 0;
    if (have === 0) continue;
    const stay = Math.min(have, left);
    left -= stay;
    if (stay === 0) delete counts[unit];
    else counts[unit] = stay;
  }
}

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  gained: ({ state }) => {
    trim(state.systems, 'dreadnought', 2);
    trim(state.systems, 'cruiser', 4);
  },
};
