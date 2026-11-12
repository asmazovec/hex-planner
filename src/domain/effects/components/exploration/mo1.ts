/**
 * Mercenary Outfit (cultural exploration, Prophecy of Kings): "You may place 1 infantry from your reinforcements on this
 * planet."
 *
 * Decided: `play`, named in the `uses` of the tactical action whose landing takes control of the planet explored (35.1):
 * one infantry is placed on that planet. With no planet newly controlled by the entry there is no "this planet" and
 * nothing is placed. Pass 1: the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:mo1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
