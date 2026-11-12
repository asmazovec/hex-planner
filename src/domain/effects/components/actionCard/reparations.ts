/**
 * Reparations (action card, After another player gains control of a planet you control): "Exhaust 1 planet that player
 * controls and ready 1 planet you control."
 *
 * A hint at the invasion step. It is played in another player's turn, when that player takes a planet of mine; an
 * entry names only its owner's components, so the card has no entry of mine to be played by (a limit of the
 * foundation). The planets readied and exhausted are entered by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:reparations';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
