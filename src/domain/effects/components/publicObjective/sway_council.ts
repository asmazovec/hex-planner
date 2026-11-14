/**
 * Sway the Council (public objective, stage I): "Spend 8 influence."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * spend 8 influence at the Score Objectives step: ready planets and trade goods. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import '../../points/status';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:sway_council';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  // What can be spent: the ready planets' influence and the trade goods (rulings). Which ones pay is not entered: nothing is taken.
requirement: ({ my, readyPlanets, planetValue }) => ({
    have: readyPlanets().reduce((sum, planet) => sum + planetValue(planet, 'influence'), 0) + my.tradeGoods,
    need: 8,
  }),
  holder: 'self',
};
