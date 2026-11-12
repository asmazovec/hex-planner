/**
 * Custodian's Favour (Custodia Vigilia, the Council Keleres' legendary planet): "While you control Mecatol Rex, it
 * gains SPACE CANNON 5 and PRODUCTION 3. Gain 2 command tokens when another player scores a victory point with the
 * second clause of the 'Imperial' strategy card."
 *
 * To be `passive`, with hints: while the player controls Custodia Vigilia and Mecatol Rex, Mecatol Rex is a unit with
 * PRODUCTION 3 for the production step: production in its system is no longer "without a unit with Production" (67.1),
 * and is limited to 3 units (as using a unit on Mecatol Rex, Council Keleres, Custodia Vigilia 9). SPACE CANNON is a
 * roll (combat), and the command tokens come from another player's strategy card, which the plan does not have:
 * both stay reminders. Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:custodiavigilia';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
