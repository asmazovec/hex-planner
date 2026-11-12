/**
 * Ghost Ship (action card; "Action"): "Place 1 destroyer from your reinforcements in a non-home system that contains a
 * wormhole and does not contain other players' ships."
 *
 * Decided: `play`. A component action that puts 1 destroyer in the system chosen (`choices.system`, a map slot). A
 * system outside the card's words (no wormhole, a home system, other players' ships there) is warned of (a new code,
 * `componentTarget`, see the report); the destroyer is placed all the same.
 *
 * Pass 1: the hint it is today; pass 2 writes the play.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:ghost_ship';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
