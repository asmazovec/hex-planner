/**
 * Aroz Hollow (The Obsidian, commander): "At any time: Apply +1 to the result of each of your units' combat rolls in The
 * Fracture."
 *
 * A hint for the combat: the plan rolls no dice, so a bonus to combat rolls changes nothing it counts.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:obsidiancommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
