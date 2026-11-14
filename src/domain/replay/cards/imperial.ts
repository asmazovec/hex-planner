/**
 * Imperial (LRR 45): the primary gains a victory point to a player who controls Mecatol Rex, who must take it (45 note 3);
 * objectives are not tracked, so the rest goes in by hand.
 */
import { MECATOL_PLANETS } from '../../mecatol';
import type { ControlOf } from '../../readers';
import type { CardHandler } from './handler';

/** Whether the player controls Mecatol Rex, in either version. */
export const controlsMecatol = (state: ControlOf): boolean => MECATOL_PLANETS.some(id => state.control[id] === 'me');

export const imperial: CardHandler = {
  apply: ({ state, primary }) => {
    if (primary && controlsMecatol(state)) state.vp += 1;
  },
};
