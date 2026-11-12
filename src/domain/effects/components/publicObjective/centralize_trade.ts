/**
 * Centralize Galactic Trade (public objective, stage II): "Spend 10 trade goods."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: play: scoring it spends the 10 trade goods (61.10); fewer held is warned of as any short payment (shortTradeGoods).
 * Pass 1 keeps it the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:centralize_trade';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
