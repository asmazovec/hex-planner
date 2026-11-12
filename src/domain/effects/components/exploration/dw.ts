/**
 * Dead World (frontier exploration, Prophecy of Kings): "Draw 1 relic."
 *
 * A hint: which relic comes off the deck is chance, so the player enters it in «Взято и сброшено» (`gains`) like any
 * card drawn; with the relic deck empty the card does nothing (exploration notes, Dead World 1). Frontier tokens are
 * explored with the ships that moved into the system, so the reminder stands with the movement.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:dw';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['movement'] };
