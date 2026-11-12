/**
 * Mordred (Nekro Virus, mech): "During combat against an opponent who has an "X" or "Y" token on 1 or more of their
 * technologies, apply +2 to the result of each of this unit's combat rolls."
 *
 * A hint at the combat: a combat roll, which the plan does not simulate.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:nekro_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
