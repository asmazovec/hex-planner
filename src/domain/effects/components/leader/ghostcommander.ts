/**
 * Sai Seravus (Ghosts of Creuss, commander): "After your ships move: For each ship that has a capacity value and
 * moved through 1 or more wormholes, you may place 1 fighter from your reinforcements with that ship if you have
 * unused capacity in the active system."
 *
 * Decided: `play`, named in `uses` of a tactical action: 1 fighter from reinforcements, placed in the active system, for
 * each ship that has capacity and moved through a wormhole (a step of its route between two systems that share a
 * wormhole type, tokens included), as far as the active system has unused capacity (Creuss notes, Sai Seravus 1). The
 * reinforcements of fighters are not limited (tokens stand in for them, 67.5.2).
 */
import type { ComponentEffect } from '../../types';
import { placeUnits } from '../../../../game/abilities/emit';
import type { AbilityContext, Hooked } from '../../../../game/abilities/types';

export const id = 'leader:ghostcommander';

/** Whether a step of the route goes through a wormhole: both systems hold one of the same type. */
function throughWormhole(ctx: AbilityContext, a: string, b: string): boolean {
  const there = ctx.wormholes(b);
  return ctx.wormholes(a).some(type => there.includes(type));
}

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const entry = ctx.entry;
    if (!ctx.held || entry?.type !== 'tactical' || entry.systemId === null) return [];
    const target = entry.systemId;
    // The ships with capacity that went through a wormhole, one fighter each.
    let ships = 0;
    for (const move of entry.moves) {
      const from = move.pickupOf ?? (ctx.pack.planets[move.from] !== undefined ? ctx.systemOf(move.from) : move.from);
      if (from === undefined || from === null) continue;
      const path = [from, ...(move.via ?? []), target];
      if (!path.slice(1).some((slot, i) => throughWormhole(ctx, path[i], slot))) continue;
      for (const [unit, n] of Object.entries(move.units)) {
        if ((n ?? 0) > 0 && ctx.capacityOf({ [unit]: 1 }).capacity > 0) ships += n ?? 0;
      }
    }
    const { load, capacity: room } = ctx.capacityOf(ctx.my.unitsIn(target));
    const fighters = Math.min(ships, Math.max(0, room - load));
    return fighters > 0 ? [placeUnits(ctx.holder, { slot: target }, { fighter: fighters })] : [];
  },
};
