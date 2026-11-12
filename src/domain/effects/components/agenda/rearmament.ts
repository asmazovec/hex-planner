/**
 * Rearmament Agreement (directive): "For: Each player places 1 mech from their reinforcements on a planet they
 * control in their home system. Against: Each player replaces each of their mechs with 1 infantry from their
 * reinforcements."
 *
 * Decided: play. "For" places 1 mech on a planet of the home system the player controls; "Against" replaces each mech
 * with an infantry: both change the board the plan counts.
 */
import type { UnitCounts } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:rearmament';

/** The same units with each mech an infantry. */
function disarmed(units: UnitCounts): UnitCounts {
  const { mech, ...rest } = units;
  return mech ? { ...rest, infantry: (rest.infantry ?? 0) + mech } : units;
}

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    const { state } = turn;
    if (turn.choices.outcome === 'for') {
      const planet = String(turn.choices.planet ?? '');
      if (planet) state.ground[planet] = { ...state.ground[planet], mech: (state.ground[planet]?.mech ?? 0) + 1 };
    } else if (turn.choices.outcome === 'against') {
      for (const planet of Object.keys(state.ground)) state.ground[planet] = disarmed(state.ground[planet]);
      for (const slot of Object.keys(state.systems)) state.systems[slot] = disarmed(state.systems[slot]);
    }
  },
};
