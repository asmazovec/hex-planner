/**
 * Negotiate Trade Routes (public objective, stage I): "Spend 5 trade goods."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * spend 5 trade goods. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import { objectiveNotMet } from '../../points/status';
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:trade_routes';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Scoring pays 5 trade goods (61.10); they do not come back with the planets readied at the end of the status phase.
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const have = ctx.my.tradeGoods;
    if (have < 5) ctx.warn(objectiveNotMet(id, have, 5));
    return have > 0 ? [tradeGoods(ctx.holder, -Math.min(5, have))] : [];
  },
};
