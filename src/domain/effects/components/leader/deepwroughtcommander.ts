/**
 * "When another player spends resources to research a technology: That player may reduce the cost by 1; if they
 * do, gain 1 commodity or convert 1 of your commodities to a trade good."
 *
 * Hint. It lowers the cost of another player's research and pays the Deepwrought player for it; the plan does not
 * carry an effect across players in another player's entry.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:deepwroughtcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['card'] };
