/**
 * Homesick Phantom, Fragment Reality (Crimson Rebellion, hero): "When you produce ships: You may place any of those
 * ships onto this card. At the start of a space combat, you may purge this card to place all ships from this card into
 * the active system."
 *
 * Decided: a reminder of production and combat. Ships kept on the card are on no system of the board, and the plan has
 * no place off the board to hold them; they come back at the start of a space combat, which is not simulated. When
 * they are placed, the fleet pool applies again (Homesick Phantom note 2), as the replay already checks.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:crimsonhero';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['production', 'combat'] };
