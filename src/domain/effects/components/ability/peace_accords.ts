/**
 * Peace Accords (Xxcha, faction ability): "After you resolve the primary or secondary ability of the "Diplomacy"
 * strategy card: You may gain control of 1 planet other than Mecatol Rex that does not contain any units and is in a
 * system that is adjacent to a planet you control."
 *
 * Decided: `play`. The ability is named in `uses` of a Diplomacy entry with the planet chosen; the player gains it
 * exhausted (ruling 3). A planet the text does not allow (Mecatol Rex, one with units, one not adjacent to a planet of
 * the player) is warned of with a new code and gained all the same.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:peace_accords';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
