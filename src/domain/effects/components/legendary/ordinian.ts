/**
 * 4X41D "Hyperion" VI (Ordinian, legendary planet, Thunder's Edge): "You may exhaust this card when you pass to draw 1
 * action card and gain 1 command token."
 *
 * To be a `play` effect: the pass entry names the card in `uses` with `choices.ordinianPool` ('tactic', 'fleet' or
 * 'strategy'), and that pool has one more token. The action card is unknown and entered with `gains`.
 * Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:ordinian';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
