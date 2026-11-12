/**
 * Maxis Central Control (Faunus, legendary planet, Thunder's Edge): "You may exhaust this card when you pass to gain
 * control of a non-home, non-legendary planet that contains no units and has no attachments."
 *
 * To be a `play` effect: the pass entry names the card in `uses` with `choices.faunusPlanet`, and I control that
 * planet after the entry. Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:faunus';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
