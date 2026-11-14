/**
 * Scuttle (action card, Prophecy of Kings): "ACTION: Choose 1 or 2 of your non-fighter ships on the game board and return
 * them to your reinforcements. Gain trade goods equal to the combined cost of those ships."
 *
 * A `play` effect of its component action. Choices, one key per ship type and system, `<unit>@<slot>`, with the number
 * returned: `{ 'carrier@0,0': 1, 'cruiser@0,0': 1 }`. The ships leave the board and the player gains their printed
 * costs in trade goods (LRR 26; a carrier 3 and a cruiser 2 give 5). A ship chosen where there is none is reported as
 * missing (`unitsMissing`) and gives nothing; more than two ships warns (`choiceOverLimit`) and is returned all the
 * same. A fighter is no non-fighter ship: it is left where it stands and gives nothing.
 *
 * The choices are `counts` slots: one button per non-fighter ship type in each system that holds mine, under the name of the system.
 */
import { removeUnits, tradeGoods } from '../../../../game/abilities/emit';
import type { GameEvent, Hooked } from '../../../../game/abilities/types';
import choiceOverLimit from '../../../rules/codes/choiceOverLimit';
import { violation } from '../../../rules/registry';
import { missingUnits } from '../../../replay/state';
import type { UnitId } from '../../../types';
import { UNIT_ORDER } from '../../../hexLayout';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:scuttle';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'ships', kind: 'counts', verb: { ru: 'Вернуть', en: 'Return one' },
    slots: ctx => Object.keys(ctx.board.systems).flatMap(slot => UNIT_ORDER
      .filter(unit => ctx.pack.units[unit] && !ctx.pack.units[unit].ground && !ctx.pack.units[unit].fighter && (ctx.my.unitsIn(slot)[unit] ?? 0) > 0)
      .map(unit => ({ key: unit + '@' + slot, unit, group: slot, max: ctx.my.unitsIn(slot)[unit] }))),
  }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    let total = 0;
    let gain = 0;
    const events: GameEvent[] = [];
    for (const [key, count] of Object.entries(ctx.choices)) {
      const [unit, slot] = key.split('@') as [UnitId, string | undefined];
      const def = ctx.pack.units[unit];
      if (!slot || !def || def.ground || def.fighter || Number(count) <= 0) continue;
      total += Number(count);
      const here = ctx.my.unitsIn(slot);
      missingUnits({ [slot]: here }, slot, { [unit]: Number(count) }, 'component').forEach(ctx.warn);
      const taken = Math.min(here[unit] ?? 0, Number(count));
      if (taken <= 0) continue;
      events.push(removeUnits(ctx.holder, { slot }, { [unit]: taken }));
      gain += ctx.unitCost({ [unit]: taken });
    }
    if (total > 2) ctx.warn(violation(choiceOverLimit.code, { limit: 2, chosen: total }, 'component'));
    return gain > 0 ? [...events, tradeGoods(ctx.holder, gain)] : events;
  },
};
