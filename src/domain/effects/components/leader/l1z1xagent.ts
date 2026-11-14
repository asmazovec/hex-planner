/**
 * I48S (L1Z1X Mindnet, agent): "After a player activates a system: You may exhaust this card to allow that player to
 * replace 1 of their infantry in the active system with 1 mech from their reinforcements."
 *
 * Decided: a `play`. Named in the `uses` of a tactical action, the agent is exhausted (the replay does it) and one
 * infantry in the active system becomes a mech from reinforcements. Faction note 1: only an infantry that stood in
 * the system when it was activated. Pass 2 writes the replacement.
 *
 * Pass 2: `play` at `playAt: 'activation'` (right after the command token, before the move: an infantry that arrives
 * later is not eligible). The infantry of the active system's space area goes first, else one on a planet of it; none
 * there is `unitsMissing`. Reinforcements of mechs are not counted.
 */
import { violation } from '../../../rules/registry';
import { placeUnits, removeUnits } from '../../../../game/abilities/emit';
import type { GameEvent } from '../../../../game/events';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:l1z1xagent';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  playAt: 'activation',
  holder: 'self',
  play: ctx => {
    const entry = ctx.entry;
    if (!ctx.held || entry?.type !== 'tactical' || entry.systemId === null) return [];
    const swap = (at: { slot: string } | { planet: string }, units: Record<string, number | undefined>): GameEvent[] | undefined =>
      (units.infantry ?? 0) > 0 ? [removeUnits(ctx.holder, at, { infantry: 1 }), placeUnits(ctx.holder, at, { mech: 1 })] : undefined;
    const inSpace = swap({ slot: entry.systemId }, ctx.my.unitsIn(entry.systemId));
    if (inSpace) return inSpace;
    for (const planetId of ctx.planetsIn(entry.systemId)) {
      const onPlanet = swap({ planet: planetId }, ctx.my.unitsOn(planetId));
      if (onPlanet) return onPlanet;
    }
    ctx.warn(violation('unitsMissing', { where: entry.systemId, unit: 'infantry', missing: 1 }));
    return [];
  },
};
