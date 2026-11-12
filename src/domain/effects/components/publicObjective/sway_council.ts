/**
 * Sway the Council (public objective, stage I): "Spend 8 influence."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * spend 8 influence at the Score Objectives step: ready planets and trade goods. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import { readyPlanetIds } from '../../../payment';
import type { ComponentEffect } from '../../types';
import '../../points/status';

export const id = 'publicObjective:sway_council';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // What can be spent: the ready planets' influence and the trade goods (rulings). Which ones pay is not entered: nothing is taken.
  requirement: ({ pack, state }) => ({
    have: readyPlanetIds(state).reduce((sum, planet) => sum + (pack.planets[planet]?.influence ?? 0), 0) + state.tradeGoods,
    need: 8,
  }),
};
