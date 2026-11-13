/**
 * Eidolon (Naaz-Rokha Alliance, mech): "If this unit is in the space area of the active system at the start of a space
 * combat, flip this card."
 *
 * A hint at the combat step: the card turns into Z-Grav Eidolon only for the space combat, which the plan does not
 * play out.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:naaz_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
