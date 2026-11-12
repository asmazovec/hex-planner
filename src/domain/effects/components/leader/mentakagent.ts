/**
 * Suffi An (Mentak Coalition, agent): "After the Pillage faction ability is used against another player: You may
 * exhaust this card: if you do, you and that player each draw 1 action card."
 *
 * Decided: a hint: it follows Pillage, which the plan does not count; the action card drawn is entered as a gain.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:mentakagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['transaction'] };
