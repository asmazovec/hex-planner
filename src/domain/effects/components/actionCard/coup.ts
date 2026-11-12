/**
 * Coup d'Etat (action card). "When another player would perform a strategic action: End that player's turn, the
 * strategic action is not resolved and the strategy card is not exhausted."
 *
 * Decided: a hint with no step. It cancels another player's strategic action; the strategy cards of opponents are not
 * planned, so there is no entry it could cancel and no check it could lift.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:coup';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
