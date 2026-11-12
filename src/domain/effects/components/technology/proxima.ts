/**
 * Proxima Targeting VI (Last Bastion, faction technology): "Cancel 1 hit produced by BOMBARDMENT rolls made against
 * your ground forces for each of your galvanized units present. At the start of a round of ground combat, you may
 * resolve BOMBARDMENT 8 (x3) against your opponent's ground forces; if you do, make an identical roll against your
 * ground forces."
 *
 * A hint: Bombardment and ground combat are fought in the invasion (89.4) with dice, which the plan does not roll.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:proxima';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
