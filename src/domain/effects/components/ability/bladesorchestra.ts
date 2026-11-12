/**
 * The Blade's Orchestra (The Obsidian, ability): "When this faction comes into play: flip your home system, double-sided
 * faction components, and all of your in-play plot cards. Then, ready Cronos Hollow and Tallin Hollow if you control
 * them."
 *
 * A hint for the component action that brings the Obsidian into play (Puppets of the Blade). The plan cannot change the
 * faction of a game or flip its home system mid-plan, and plot cards are not tracked; nothing is counted or lifted.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:bladesorchestra';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
