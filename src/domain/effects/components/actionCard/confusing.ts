/**
 * Confusing Legal Text (action card; "When you are elected as the outcome of an agenda"): "Choose 1 player. That
 * player is the elected player instead."
 *
 * A hint with no step: it is played in the agenda phase, which has no block of its own, and it changes the outcome of
 * an election, which the plan does not model (votes and outcomes are not counted; a law that results is entered with
 * the entry's gains).
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:confusing';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
