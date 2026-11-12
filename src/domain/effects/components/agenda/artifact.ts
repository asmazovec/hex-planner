/**
 * Ixthian Artifact (agenda): "For: The speaker rolls 1 die. If the result is 6-10, each player may research 2
 * technologies. If the result is 1-5, destroy all units in Mecatol Rex's system, and each player with units in
 * systems adjacent to Mecatol Rex's system destroys 3 of their own units in each of those systems. Against: No
 * effect."
 *
 * A hint. A directive decided by a die roll; the plan rolls no dice, and what the player researches or loses is
 * entered as research or a change of units.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:artifact';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
