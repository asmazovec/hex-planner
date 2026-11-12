/**
 * Crash Landing (action card, Thunder's Edge): "Place 1 of your ground forces from the space area of the active system
 * onto a planet in that system other than Mecatol Rex; if the planet contains other players' units, place your ground
 * force into coexistence." Window: when your last ship in the active system is destroyed.
 *
 * Decided (pass 2): a hint of the combat step with a waiver. With the last ship of the active system lost, the replay
 * warns that the ground forces left in the space area exceed its capacity (`capacitySystem`, 16.3); for the entry that
 * plays the card (`uses` or `spends`) that warning is lifted when the excess is the one ground force the card lands.
 * Coexistence and Mecatol Rex are not modelled. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:crashlanding';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
