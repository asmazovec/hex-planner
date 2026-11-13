/**
 * Pride of Kenara (Emirates of Hacan, mech): "This planet's card may be traded as part of a transaction; if you do,
 * move all of your units from this planet to another planet you control."
 *
 * Decided: a `hint`. A transaction moves components of the holdings; a planet card is control of a planet, which the
 * transactions of the plan do not hand over, and moving the units off it needs a chosen planet. Nothing is counted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:hacan_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
