/**
 * Homeland Defense Act (agenda, law): "For: Each player can have any number of PDS units on planets they control.
 * Against: Each player destroys 1 of their PDS units."
 *
 * Decided: a waiver. A planet holds at most two PDS (63.3, 85.5); the replay warns of a third (`structureLimit` with
 * the planet). While the law is in play that check is lifted for PDS on a planet, for every player; the limit of the
 * reinforcements (six PDS, 24.4) and the number Construction places stand. "Against" is a one-off choice of a PDS to
 * destroy, entered by the player. Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:defense_act';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
