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
import { sourceSlot } from '../../../replay/board';
import { capacity } from '../../../replay/transport';
import { wormholesOf } from '../../../movement';
import type { UnitCounts } from '../../../types';
import { holderOf } from '../../registry';
import type { ComponentEffect, EffectTurn } from '../../types';

export const id = 'leader:ghostcommander';

/** Whether a step of the route goes through a wormhole: both systems hold one of the same type. */
function throughWormhole({ game, pack, shared }: EffectTurn, a: string, b: string): boolean {
  const tokens = shared.wormholeTokens;
  const there = wormholesOf(game, pack, b, tokens);
  return wormholesOf(game, pack, a, tokens).some(type => there.includes(type));
}

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    const { entry, game, pack, state, shared, held } = turn;
    if (!held || entry.type !== 'tactical' || entry.systemId === null) return;
    const target = entry.systemId;
    const holder = holderOf(game, state, shared);
    // The ships with capacity that went through a wormhole, one fighter each.
    let ships = 0;
    for (const move of entry.moves) {
      const from = move.pickupOf ?? sourceSlot(game, pack, move.from);
      if (from === null) continue;
      const path = [from, ...(move.via ?? []), target];
      if (!path.slice(1).some((slot, i) => throughWormhole(turn, path[i], slot))) continue;
      for (const [unit, n] of Object.entries(move.units)) {
        if ((n ?? 0) > 0 && capacity(game, { [unit]: 1 }, holder, pack).capacity > 0) ships += n ?? 0;
      }
    }
    const here: UnitCounts = state.systems[target] ?? {};
    const { load, capacity: room } = capacity(game, here, holder, pack);
    const fighters = Math.min(ships, Math.max(0, room - load));
    if (fighters > 0) state.systems[target] ={ ...here, fighter: (here.fighter ?? 0) + fighters };
  },
};
