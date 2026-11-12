/**
 * Awaken (Titans of Ul): "After you activate a system that contains 1 or more of your sleeper tokens: You may
 * replace each of those tokens with 1 PDS from your reinforcements."
 *
 * Decided: hint. Sleeper tokens are not on the board of the plan, so there is nothing to replace; the reminder stands
 * at the activation.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:awaken';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['activation'] };
