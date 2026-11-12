/**
 * Mirage Flight Academy (Mirage, legendary planet): "You may exhaust this card at the end of your turn to place up to 2
 * fighters from your reinforcements in any system that contains 1 or more of your ships"
 *
 * To be a `play` effect: any entry of my turn names the card in `uses` with `choices.mirageSystem` (a slot) and
 * `choices.mirageFighters` (1 or 2); the fighters stand in that space area after the entry. Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:mirage';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
