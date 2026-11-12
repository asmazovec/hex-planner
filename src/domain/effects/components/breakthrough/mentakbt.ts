/**
 * The Table's Grace (Mentak Coalition, breakthrough): "If you have the Cruiser II unit upgrade technology, flip this
 * card and place it on top of cruiser II. Corsair [Cost 2, Combat 6, Move 3, Capacity 2] If the active system
 * contains another player's non-fighter ships, this unit can move through systems that contain other players'
 * ships."
 *
 * Decided: a passive mix, in force once the breakthrough is held together with Cruiser II (the card is flipped onto
 * it). The Corsair's numbers are a `modify` of the cruiser (Capacity 2 over the 1 of Cruiser II; Move 3 and Cost 2
 * as Cruiser II has them), and its ability waives `routeBlocked` for a move of Corsairs while the active system
 * holds another player's non-fighter ships (faction note 1: through the ships of any player).
 *
 * Pass 1: the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:mentakbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
