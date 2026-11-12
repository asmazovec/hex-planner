/**
 * Psychospore (Arborec, breakthrough): "ACTION: Exhaust this card to remove a command token from a system that contains
 * 1 or more of your infantry and return it to your reinforcements. Then, place 1 infantry in that system."
 *
 * Pass 1: a hint as it is today. Pass 2 makes it a `play` with the system as its choice: my command token leaves that
 * system (so it may be activated again this round) and one infantry is placed there, but only where my infantry
 * already stands. The replay exhausts the card ("Exhaust this card").
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:arborecbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
