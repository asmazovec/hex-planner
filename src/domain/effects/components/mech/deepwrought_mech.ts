/**
 * "When another player activates this system, if this unit is coexisting, you may move it and any of your infantry
 * on its planet to a planet you control in your home system."
 *
 * Hint. It acts in another player's activation, and its move is a choice of the Deepwrought player that the plan
 * does not replay.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:deepwrought_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['activation'] };
