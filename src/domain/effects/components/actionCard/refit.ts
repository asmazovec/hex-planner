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
import choiceOverLimit from '../../../rules/codes/choiceOverLimit';
import { violation } from '../../../rules/registry';
import { add, take } from '../../../replay/state';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:refit';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'infantry', kind: 'counts', verb: { ru: 'Заменить', en: 'Replace one' },
    slots: ({ state }) => Object.keys(state.ground).filter(planetId => (state.ground[planetId]?.infantry ?? 0) > 0)
      .map(planetId => ({ key: planetId, unit: 'infantry' as const, planet: planetId, max: state.ground[planetId]?.infantry })),
  }],
  play: ({ state, choices, warnings }) => {
    const chosen = Object.entries(choices).filter(([, count]) => Number(count) > 0);
    const total = chosen.reduce((sum, [, count]) => sum + Number(count), 0);
    if (total > 2) warnings.push(violation(choiceOverLimit.code, { limit: 2, chosen: total }, 'component'));
    for (const [planetId, count] of chosen) {
      const removed = take(state.ground, planetId, { infantry: Number(count) }, warnings, 'component');
      if (removed.infantry) add(state.ground, planetId, { mech: removed.infantry });
    }
  },
};
