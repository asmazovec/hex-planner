/**
 * Doctor Sucaban (Universities of Jol-Nar, agent): "When a player spends resources to research: You may exhaust this
 * card to allow that player to remove any number of their infantry from the game board. For each unit removed, reduce
 * the resources spent by 1."
 *
 * Decided: `play`. Named in the `uses` of an entry that researches with resources (the Technology card), the agent
 * (exhausted by the replay, as any agent used) removes the infantry chosen in the entry's `choices` (planet id to the
 * number removed, never more than stand there) and lowers the cost of the research by that number: the payment check
 * then runs against the lower cost, nothing is listed as waived. Used for another player it is not modelled: an
 * opponent's entry does not change my state.

 */
import type { ComponentEffect } from '../../types';
import { removeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:jolnaragent';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // The infantry removed, by planet: one button for each planet that holds some, as many presses as units removed.
  choose: [{
    key: 'infantry', kind: 'counts', verb: { ru: 'Убрать', en: 'Remove one' },
    slots: ({ state }) => Object.entries(state.ground)
      .filter(([, units]) => (units.infantry ?? 0) > 0)
      .map(([planet, units]) => ({ key: planet, unit: 'infantry' as const, planet, max: units.infantry })),
  }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (!ctx.held) return [];
    // The infantry chosen by planet are removed, never more than stand there; each lowers the resources spent by 1.
    let removed = 0;
    const events = [];
    for (const [planet, wanted] of Object.entries(ctx.choices)) {
      const stands = ctx.my.unitsOn(planet).infantry ?? 0;
      const count = Math.min(Math.max(0, Math.floor(Number(wanted)) || 0), stands);
      if (count <= 0) continue;
      events.push(removeUnits(ctx.holder, { planet }, { infantry: count }));
      removed += count;
    }
    if (removed === 0) return [];
    // The card's payment was checked first as a shortfall of `needed`; against the cost lowered by `removed` it may be none.
    const found = ctx.warned.find(w => w.code === 'shortResources');
    if (found === undefined) return events;
    const needed = Math.max(0, Number(found.params.needed) - removed);
    if (needed > Number(found.params.paid)) ctx.revise(found, { ...found, params: { ...found.params, needed } });
    else ctx.revise(found);
    return events;
  },
};
