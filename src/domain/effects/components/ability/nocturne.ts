/**
 * Nocturne (The Obsidian, ability): "This faction cannot be chosen during setup."
 *
 * A hint with no step: the ability speaks of the setup of the game, before any entry of a plan, so no step of the
 * replay checks it and nothing is lifted. The Obsidian comes into play only through Puppets of the Blade.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:nocturne';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
