/**
 * Indomitus (Xxcha, mech): "You may use this unit's SPACE CANNON against ships that are in adjacent systems."
 *
 * Decided: a hint in the combat step. Space cannon rolls are combat; the plan rolls no dice.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:xxcha_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
