/**
 * The Atrament (Primor, legendary planet): "You may exhaust this card at the end of your turn to place up to 2 infantry
 * from your reinforcements on any planet you control"
 *
 * To be a `play` effect: any entry of my turn names the card in `uses` (the replay exhausts it, its text says so) with
 * `choices.primorPlanet` and `choices.primorInfantry` (1 or 2); the infantry stand on that planet after the entry.
 * The card is played only by the player who controls Primor (53.3). Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:primor';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
