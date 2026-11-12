/**
 * Neural Parasite (The Obsidian, technology): "At the start of your turn, destroy 1 of another player's infantry in or
 * adjacent to a system that contains your infantry. This technology cannot be researched."
 *
 * A hint at the start of a turn, in the block of the activation. Which infantry is destroyed is the player's choice
 * among the other players' units, and the plan has no place for it in an entry: the loss is entered by hand.
 *
 * "This technology cannot be researched" lifts nothing: it is a restriction, a check that holds for everyone who
 * researches the card. The replay does not make it yet; its test is red until the research step warns of it.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:parasite-obs';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['activation'] };
