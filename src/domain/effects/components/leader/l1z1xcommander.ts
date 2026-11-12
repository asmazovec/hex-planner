/**
 * 2RAM (L1Z1X Mindnet, commander): "At any time: Units that have PLANETARY SHIELD do not prevent you from using
 * BOMBARDMENT."
 *
 * Decided: a hint at the invasion. Planetary Shield and Bombardment are rolls of combat the plan does not count.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:l1z1xcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
