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
 * The choices have no interface yet: their keys are made of a ship and a system, which `ChoiceSpec` cannot declare.
 */
import choiceOverLimit from '../../../rules/codes/choiceOverLimit';
import { violation } from '../../../rules/registry';
import { take } from '../../../replay/state';
import { productionCost } from '../../../unitStats';
import type { UnitId } from '../../../types';
import { holderOf } from '../../registry';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:scuttle';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ game, state, shared, pack, choices, warnings }) => {
    let total = 0;
    let gain = 0;
    for (const [key, count] of Object.entries(choices)) {
      const [unit, slot] = key.split('@') as [UnitId, string | undefined];
      const def = pack.units[unit];
      if (!slot || !def || def.ground || def.fighter || Number(count) <= 0) continue;
      total += Number(count);
      const removed = take(state.systems, slot, { [unit]: Number(count) }, warnings, 'component');
      gain += productionCost(removed, game.faction, holderOf(game, state, shared), pack);
    }
    if (total > 2) warnings.push(violation(choiceOverLimit.code, { limit: 2, chosen: total }, 'component'));
    state.tradeGoods += gain;
  },
};
