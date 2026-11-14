/**
 * Push Boundaries (public objective, stage I, Prophecy of Kings): "Control more planets than each of 2 of your neighbors."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the opponents who are the owner's neighbours (LRR 60,
 * `areNeighbors`) and control fewer planets than the owner; a tie is not "more". Only the planets of systems on the
 * board are counted (a rival's state also holds the planets of a home system that is not on the map). Unmet is the
 * warning objectiveUnmet (61.5.1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:push_boundaries';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ holder, others, neighbours, controlledOnBoard }) => {
    const mine = controlledOnBoard(holder);
    let have = 0;
    for (const other of others()) if (neighbours(holder, other) && controlledOnBoard(other) < mine) have += 1;
    return { have, need: 2 };
  },
  holder: 'self',
};
