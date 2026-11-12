/**
 * Arms Reduction (agenda, directive): "For: Each player destroys all but 2 of their dreadnoughts and all but 4 of
 * their cruisers. Against: At the start of the next strategy phase, each player exhausts each of their planets that
 * have a technology specialty."
 *
 * Decided: play. The "For" outcome changes the board the plan counts: an agenda entry that resolves it (gains the
 * directive) destroys the dreadnoughts beyond 2 and the cruisers beyond 4. Which ones stay is the player's choice when
 * they stand in more than one system, and that choice has no field yet. "Against" exhausts planets at a later phase
 * and is not modelled. Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:arms_reduction';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
