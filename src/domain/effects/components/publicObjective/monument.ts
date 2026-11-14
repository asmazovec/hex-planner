/**
 * Erect a Monument (public objective, stage I): "Spend 8 resources."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * spend 8 resources at the Score Objectives step: ready planets and trade goods. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import { planetValue, readyPlanetIds } from '../../../payment';
import '../../points/status';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:monument';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  // What can be spent: the ready planets' resources and the trade goods (rulings). Which ones pay is not entered: nothing is taken.
  requirement: ({ pack, game, state, shared }) => ({
    have: readyPlanetIds(state).reduce((sum, planet) => sum + planetValue(pack, state, planet, 'resources', { faction: game.faction, shared }), 0) + state.tradeGoods,
    need: 8,
  }),
  holder: 'self',
};
