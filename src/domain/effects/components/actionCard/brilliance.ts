/**
 * Brilliance (action card, Thunder's Edge): "ACTION: Ready 1 of your planets that has a technology specialty or choose 1
 * player to gain their breakthrough."
 *
 * A `play` effect of its component action. Choices: `{ planet: '<planet id>' }` readies that planet (as the readied
 * planets of a strategy card do, LRR 71: a planet I do not control warns `readyNotControlled`, one without a technology
 * specialty warns with a new code and is readied all the same); `{ player: '<me or opponent id>' }` is the other
 * branch, gaining that player's breakthrough, which is not modelled (a holder has only its own faction's breakthrough).
 *
 * Pass 1: still the hint it is today; pass 2 writes `play`.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:brilliance';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
