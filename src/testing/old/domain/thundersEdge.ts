import type { DataPack } from '../../../domain/types';
import type { Game, Plan } from './types';
import type { GameState } from './types';
import { fractureSlots, type SliceOwners } from '../../../domain/thundersEdge';
import { slotKeyOf } from '../../../domain/layouts';
import { withSlotsMoved } from './slotRename';
import { planetsOf, isStation } from '../../../domain/replay/board';
import { othersIn } from './replay/production';

/**
 * The Fracture's systems take other slots when it moves, and what the game says about them follows: plans speak of a
 * system by its slot. `before` is the game as it stood; a Fracture that did not move leaves `next` as it is.
 */
export function withFractureMoved(before: Game, next: Game, pack: DataPack): Game {
  const place = (game: Game) => Object.fromEntries(fractureSlots(game.fracture.seat, game.playerCount, pack, game.layout).map(s => [s.tileId, slotKeyOf(s.q, s.r)]));
  const old = place(before);
  const now = place(next);
  const moved = new Map(Object.keys(old).filter(id => now[id] && now[id] !== old[id]).map(id => [old[id], now[id]]));
  if (moved.size === 0) return next;
  return withSlotsMoved(next, slot => moved.get(slot) ?? slot);
}
/**
 * Effect: being the only player with units in a system gives control of its space stations (space stations 2); leaving
 * keeps it. Other players' ships still there mean a combat first, so nothing changes (2.1).
 */
export function claimStations(game: Game, state: GameState, systemId: string, pack: DataPack): void {
  const stations = planetsOf(game, systemId, pack).filter(id => isStation(pack, id));
  if (stations.length === 0 || othersIn(game, state, systemId, pack, true)) return;
  const mine = [state.systems[systemId], ...planetsOf(game, systemId, pack).map(id => state.ground[id])]
    .some(units => Object.values(units ?? {}).some(n => (n ?? 0) > 0));
  if (mine) for (const id of stations) state.control[id] = 'me';
}
/** Who holds each expedition part: mine come from the expeditions of the plan's turns, the others' are tapped in. */
export function sliceOwners(game: Game, plan?: Plan): SliceOwners {
  const owners: SliceOwners = {};
  for (const [id, owner] of Object.entries(game.expedition.slices)) if (owner) owners[id] = owner;
  for (const round of plan?.rounds ?? []) {
    for (const entry of round.entries) {
      if (entry.status === 'cancelled') continue;
      for (const act of 'acts' in entry ? entry.acts ?? [] : []) if (act.kind === 'expedition' && act.sliceId) owners[act.sliceId] = 'me';
    }
  }
  return owners;
}
