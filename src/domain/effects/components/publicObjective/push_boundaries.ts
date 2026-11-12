/**
 * Push Boundaries (public objective, stage I, Prophecy of Kings): "Control more planets than each of 2 of your neighbors."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the opponents who are the owner's neighbours (LRR 60,
 * `areNeighbors`) and control fewer planets than the owner; a tie is not "more". Only the planets of systems on the
 * board are counted (a rival's state also holds the planets of a home system that is not on the map). Unmet is the
 * warning objectiveUnmet (61.5.1).
 */
import { areNeighbors } from '../../../neighbors';
import { boardSlots } from '../../../movement';
import { planetsOf } from '../../../replay/board';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:push_boundaries';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, game, state, shared }) => {
    const onBoard = new Set(boardSlots(game, pack).flatMap(slot => planetsOf(game, slot, pack)));
    const count = (board: typeof state) => Object.keys(board.control).filter(planet => board.control[planet] === 'me' && onBoard.has(planet)).length;
    const mine = count(state);
    let have = 0;
    for (const opponent of game.opponents) {
      const rival = shared.rivals?.[opponent.id];
      if (rival && areNeighbors(game, state, rival, pack) && count(rival) < mine) have += 1;
    }
    return { have, need: 2 };
  },
};
