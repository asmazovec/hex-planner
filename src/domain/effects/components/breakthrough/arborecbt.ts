/**
 * Psychospore (Arborec, breakthrough): "ACTION: Exhaust this card to remove a command token from a system that contains
 * 1 or more of your infantry and return it to your reinforcements. Then, place 1 infantry in that system."
 *
 * A `play` with the system as its choice: my command token leaves that system (so it may be activated again this
 * round) and one infantry is placed there, but only where my infantry already stands. The replay exhausts the card
 * ("Exhaust this card").
 */
import { planetsOf } from '../../../replay/board';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:arborecbt';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'systemId', kind: 'system' }],
  play: ({ choices, state, game, pack, held, warnings }) => {
    if (!held) return;
    const systemId = String(choices.systemId ?? '');
    if (systemId === '') return;
    const planet = planetsOf(game, systemId, pack).find(p => state.control[p] === 'me' && (state.ground[p]?.infantry ?? 0) > 0);
    const inSpace = (state.systems[systemId]?.infantry ?? 0) > 0;
    if (planet === undefined && !inSpace) {
      warnings.push(violation(componentCondition.code, { id, name: 'Psychospore', condition: 'the system holds none of my infantry' }));
      return;
    }
    // The command token goes back to the reinforcements; the infantry comes from them too and stands where mine does.
    state.tokensOnMap = state.tokensOnMap.filter(slot => slot !== systemId);
    if (planet !== undefined) state.ground[planet] = { ...state.ground[planet], infantry: (state.ground[planet]?.infantry ?? 0) + 1 };
    else state.systems[systemId] = { ...state.systems[systemId], infantry: (state.systems[systemId]?.infantry ?? 0) + 1 };
  },
};
