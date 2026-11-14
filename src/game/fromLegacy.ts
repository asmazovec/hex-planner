/**
 * The bridge from the old model while both live: the old `Game` read as a `Table`, the ids between the two, the state of
 * an old game as a board and the entries of its plan as turns (the views of a board in the old model are in
 * `legacyViews.ts`). Goes with the old code (step 5 of the move).
 */
import type { PlayerId } from './types';

export const idOfSeat = (seat: number): PlayerId => `p${seat}`;
/** The seat of the first player who is not at the table: the seats of the table stop at eight. */
export const GHOST_SEAT = 100;

export const SLOT = /^-?\d+,-?\d+$/;
