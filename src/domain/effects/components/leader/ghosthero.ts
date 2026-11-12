/**
 * Riftwalker Meian, Singularity Reactor (Ghosts of Creuss, hero): "ACTION: Swap the positions of any 2 non-Fracture
 * systems that contain wormholes or your units, other than the Creuss system, Ahk Creuxx system, or the Wormhole
 * Nexus."
 *
 * A hint: the swap of two systems changes the map, and the replay keeps the map of the game fixed; nothing of it is counted.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:ghosthero';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
