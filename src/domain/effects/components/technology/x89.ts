/**
 * X-89 Bacterial Weapon Ω: "After 1 or more of your units use BOMBARDMENT against a planet, if at least 1 of your
 * opponent's infantry was destroyed, you may destroy all of your opponent's infantry on that planet."
 *
 * A hint at the invasion: it hangs on the dice of a bombardment, which the plan does not roll.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:x89';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
