/**
 * Z-Grav Eidolon (Naaz-Rokha Alliance, mech): "If this unit is in the space area of the active system, it is also a
 * ship. At the end of a space battle in the active system, flip this card."
 *
 * A hint at the combat step. The mech is a ship only during the Space Combat step, only in the active system and only
 * in its space area (Naaz-Rokha Alliance, Eidolon / Z-Grav Eidolon note 1), and turns back at the end of the combat,
 * when it counts against capacity again (note 6). The plan does not play out combat, so outside it the mech is the
 * ground force the capacity and fleet pool checks count: nothing is lifted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:naaz_mech_space';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
