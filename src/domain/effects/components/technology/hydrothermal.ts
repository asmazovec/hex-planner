/**
 * "At the start of the status phase, gain 1 trade good for each ocean card in play."
 *
 * Hint. Ocean cards are not counted by the plan, so the trade goods cannot be; the player enters them.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:hydrothermal';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['status'] };
