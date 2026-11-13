/**
 * Solar Flare (action card). "After you activate a system: During the "Movement" step of this tactical action, other
 * players cannot use SPACE CANNON against your ships."
 *
 * Decided: a hint in the activation block (the step its window names). Space Cannon rolls are dice, which the plan does
 * not simulate; no movement rule of the replay speaks of Space Cannon, so nothing is lifted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:solar_flare';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
