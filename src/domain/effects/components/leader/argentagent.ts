/**
 * Trilossa Aun Mirik (Argent Flight, agent): "When a player produces ground forces in a system: You may exhaust this
 * card: that player may place those units on any planets they control in that system and any adjacent systems."
 *
 * Pass 1: a hint as it is today. Pass 2 makes it a `play` named in the `uses` of the entry that produces, with a waiver
 * of `productionPlace` (68.3: ground forces go on the planet of the producing unit) narrowed to planets the producer
 * controls in the active system or a system adjacent to it. The replay exhausts the agent.
 */
import { adjacentTo } from '../../../movement';
import { planetsOf, systemSlots } from '../../../replay/board';
import type { ComponentEffect, WaiverContext } from '../../types';

export const id = 'leader:argentagent';

/** A planet the producer controls, in the active system or one adjacent to it. */
const reachable = (planetId: string, ctx: WaiverContext): boolean => {
  const active = ctx.entry?.type === 'tactical' ? ctx.entry.systemId : undefined;
  if (!active || ctx.after.control[planetId] !== 'me') return false;
  const near = [active, ...adjacentTo(ctx.game, active, ctx.pack)];
  return systemSlots(ctx.game).some(slot => near.includes(slot) && planetsOf(ctx.game, slot, ctx.pack).includes(planetId));
};

// Named in «Used» of the production; the replay exhausts the agent. The placing itself is the entry's own.
export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  waive: [{
    code: 'productionPlace',
    rule: 'that player may place those units on any planets they control in that system and any adjacent systems',
    when: (warning, ctx) => reachable(String(warning.params.planetId), ctx),
  }],
};
