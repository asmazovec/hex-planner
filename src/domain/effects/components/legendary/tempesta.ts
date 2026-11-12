/**
 * Ionian Fuel Refinery (Tempesta, Thunder's Edge): "You may exhaust this card after you activate a system to apply +1
 * to the move value of 1 of your ships during this tactical action."
 *
 * Pass 1: a hint. To become a `play` with a waiver of `speedShort` for the tactical entry that names it in `uses`,
 * narrowed to one ship (a single ship of its type in the moves) short by one system, and to one such warning of the
 * entry. Not a `modify` of `speed`: a modify is passive and changes every ship of the faction, the card one ship once.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:tempesta';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
