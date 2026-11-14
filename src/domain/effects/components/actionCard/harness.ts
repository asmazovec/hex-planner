/**
 * Harness Energy (action card). "After you activate an anomaly: Replenish your commodities."
 *
 * Decided: a play effect, named in the `uses` (or `spends`) of the tactical action that activates the anomaly: the
 * player's commodities are filled up to the commodity value of their faction sheet (21.2, as Trade's replenish).
 * Commodities are counted by the plan (a transaction gives them, `shortCommodities`), so a later transaction of the
 * round can give what the card brought. It may be played at the maximum already (ruling 1), which changes nothing.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import { commodities } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:harness';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    const printed = ctx.pack.factions[ctx.my.faction]?.commodities;
    return printed === undefined || printed === ctx.my.commodities ? [] : [commodities(ctx.holder, printed - ctx.my.commodities)];
  },
};
