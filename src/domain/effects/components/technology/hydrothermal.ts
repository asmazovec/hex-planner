/**
 * "At the start of the status phase, gain 1 trade good for each ocean card in play."
 *
 * Hint. Ocean cards are not counted by the plan, so the trade goods cannot be; the player enters them.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:hydrothermal';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['status'] };
