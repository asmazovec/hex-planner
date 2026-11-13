/**
 * It Feeds on Carrion, Dimensional Anchor (Vuil'raith Cabal, hero): "ACTION: Each other player rolls a die for each
 * of his non-fighter ships that are in or adjacent to a system that contains a dimensional tear. on a 1-3, capture
 * that unit. ... Then, purge this card."
 *
 * Decided: hint. Dice and captured units are not counted; the replay already purges a hero played.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:cabalhero';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
