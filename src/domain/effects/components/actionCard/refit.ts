/**
 * Refit Troops (action card, Prophecy of Kings): "ACTION: Choose 1 or 2 of your infantry on the game board. Replace each
 * of those infantry with mechs."
 *
 * A `play` effect of its component action. Choices, one key per place (a planet id) with the number of infantry
 * replaced there: `{ h1: 2 }` or `{ h1: 1, t1: 1 }`. The infantry go back to the reinforcements and as many mechs
 * come from them (LRR 72); an infantry chosen where there is none is reported as any missing unit (`unitsMissing`) and
 * nothing replaces it; more than two warns (`choiceOverLimit`) and is replaced all the same, as the plan forbids
 * nothing. Mechs exist only with Prophecy of Kings, which this card needs anyway.
 *
 * The choices are `counts` slots: one button per planet that holds my infantry (`ChoiceSpec.slots`).
 */
import { placeUnits, removeUnits } from '../../../../game/abilities/emit';
import type { GameEvent, Ability } from '../../../../game/abilities/types';
import choiceOverLimit from '../../../rules/codes/choiceOverLimit';
import { violation } from '../../../rules/registry';
import { missingUnits } from '../../../replay/state';

export const id = 'actionCard:refit';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'infantry', kind: 'counts', verb: { ru: 'Заменить', en: 'Replace one' },
    slots: ctx => ctx.my.planets().filter(planet => (planet.ground.infantry ?? 0) > 0)
      .map(planet => ({ key: planet.id, unit: 'infantry' as const, planet: planet.id, max: planet.ground.infantry })),
  }],
  holder: 'self',
  play: ctx => {
    const chosen = Object.entries(ctx.choices).filter(([, count]) => Number(count) > 0);
    const total = chosen.reduce((sum, [, count]) => sum + Number(count), 0);
    if (total > 2) ctx.warn(violation(choiceOverLimit.code, { limit: 2, chosen: total }, 'component'));
    const events: GameEvent[] = [];
    for (const [planet, count] of chosen) {
      const here = ctx.my.unitsOn(planet);
      missingUnits({ [planet]: here }, planet, { infantry: Number(count) }, 'component').forEach(ctx.warn);
      const removed = Math.min(here.infantry ?? 0, Number(count));
      if (removed > 0) events.push(removeUnits(ctx.holder, { planet }, { infantry: removed }), placeUnits(ctx.holder, { planet }, { mech: removed }));
    }
    return events;
  },
};
