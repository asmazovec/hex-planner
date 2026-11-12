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

export const id = 'leader:jolnaragent';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ state, choices, held, warnings }) => {
    if (!held) return;
    // The infantry chosen by planet are removed, never more than stand there; each lowers the resources spent by 1.
    let removed = 0;
    for (const [planet, wanted] of Object.entries(choices)) {
      const stands = state.ground[planet]?.infantry ?? 0;
      const count = Math.min(Math.max(0, Math.floor(Number(wanted)) || 0), stands);
      if (count <= 0) continue;
      state.ground[planet] = { ...state.ground[planet], infantry: stands - count };
      removed += count;
    }
    if (removed === 0) return;
    // The card's payment was checked first as a shortfall of `needed`; against the cost lowered by `removed` it may be none.
    const index = warnings.findIndex(w => w.code === 'shortResources');
    if (index < 0) return;
    const warning = warnings[index];
    const needed = Math.max(0, Number(warning.params.needed) - removed);
    if (needed > Number(warning.params.paid)) warnings[index] = { ...warning, params: { ...warning.params, needed } };
    else warnings.splice(index, 1);
  },
};
