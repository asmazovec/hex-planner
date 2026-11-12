/**
 * Confounding Legal Text (action card, agenda phase). "When another player is elected as the outcome of an agenda: You
 * are the elected player instead."
 *
 * Decided: a hint with no step. Elections are not counted by the plan; what the elected agenda then does is entered
 * as the agenda itself (a law gained) or by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:confounding';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
