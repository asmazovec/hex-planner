/**
 * Vos Hollow (The Obsidian, agent): "When a player's ship is destroyed during any combat: You may exhaust this card; if
 * you do, that player's opponent must destroy 1 of their ships of the same type in the active system."
 *
 * A hint for the combat. The plan rolls no dice: the losses of a combat are entered by the player (`losses`), so the
 * second ship destroyed is entered as a loss too. Nothing is checked, so nothing is lifted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:obsidianagent';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
