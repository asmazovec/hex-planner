/**
 * Psychospore (Arborec, breakthrough): "ACTION: Exhaust this card to remove a command token from a system that contains
 * 1 or more of your infantry and return it to your reinforcements. Then, place 1 infantry in that system."
 *
 * A `play` with the system as its choice: my command token leaves that system (so it may be activated again this
 * round) and one infantry is placed there, but only where my infantry already stands. The replay exhausts the card
 * ("Exhaust this card").
 */
import { commandToken, placeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:arborecbt';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'systemId', kind: 'system' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (!ctx.held) return [];
    const systemId = String(ctx.choices.systemId ?? '');
    if (systemId === '') return [];
    const planet = ctx.planetsIn(systemId).find(p => ctx.board.planets[p]?.owner === ctx.holder && (ctx.my.unitsOn(p).infantry ?? 0) > 0);
    const inSpace = (ctx.my.unitsIn(systemId).infantry ?? 0) > 0;
    if (planet === undefined && !inSpace) {
      ctx.warn(violation(componentCondition.code, { id, name: 'Psychospore', condition: 'the system holds none of my infantry' }));
      return [];
    }
    // The command token goes back to the reinforcements; the infantry comes from them too and stands where mine does.
    return [commandToken.remove(ctx.holder, systemId), placeUnits(ctx.holder, planet !== undefined ? { planet } : { slot: systemId }, { infantry: 1 })];
  },
};
