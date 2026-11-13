/**
 * Assault Cannon (technology, base game): "At the start of a space combat in a system that contains 3 or more of your
 * non-fighter ships, your opponent must destroy 1 of their non-fighter ships."
 *
 * A hint: the ship the opponent destroys is their loss in the battle, which the plan does not fight and which is not
 * counted among my losses (`losses` are mine only). The reminder stands in the combat block.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:asc';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
