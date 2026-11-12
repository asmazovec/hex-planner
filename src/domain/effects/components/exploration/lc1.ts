/**
 * Lost Crew (frontier exploration): "Draw 2 action cards."
 *
 * A hint with no step. Which two cards come from the deck is not known when the plan is made; the player enters them
 * in «Gained and discarded» of the entry (`gains`), which already puts them in the hand. Nothing is validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:lc1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
