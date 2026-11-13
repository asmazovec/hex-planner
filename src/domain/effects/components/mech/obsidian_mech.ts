/**
 * Viper Hollow (The Obsidian, mech): "If this unit was coexisting when this card flipped to this side, gain control of
 * its planet; the other player's units are now coexisting."
 *
 * A hint for the component action that flips it (Puppets of the Blade). Coexistence and the change of faction are not
 * modelled; the control gained is entered by the player. Nothing is checked, so nothing is lifted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:obsidian_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
