import type { Game, DataPack, UnitCounts } from '../../../domain/types';
import type { GameState } from './types';
import { holderOf, inForceOf, effectOf } from '../../../domain/effects/registry';
import { holdsShips } from '../../../domain/movement';

/**
 * The systems that end a route of `mover` (undefined or `me` for me): the ships of every other player. Over the replayed
 * state (mine, with the opponents' in `rivals`) when there is one; what stands on the map by hand for anyone it does not count.
 */
export function blockersOf(game: Game, state: Pick<GameState, 'systems' | 'rivals'> | null, mover: string | undefined, pack: DataPack): Set<string> {
  const blockers = shipBlockersOf(game, state, mover, pack);
  for (const slot of passageBarredOf(game, state, mover, pack)) blockers.add(slot);
  return blockers;
}
/**
 * The systems that the components in force of every player but the mover bar to the mover's ships (`stopsPassage`:
 * Aerie Hololattice). They end a route like a system with other players' ships, so a route through one is warned of.
 * Asked over the replayed state only: `state` is mine, with the opponents' in `rivals`.
 */
export function passageBarredOf(game: Game, state: Pick<GameState, 'systems' | 'rivals'> | null, mover: string | undefined, pack: DataPack): Set<string> {
  const barred = new Set<string>();
  if (!state || !('holdings' in state)) return barred;
  const shared = state as GameState;
  const players: Array<[string, GameState]> = [['me', shared], ...Object.entries(shared.rivals ?? {})];
  for (const [owner, own] of players) {
    if (owner === (mover ?? 'me')) continue;
    const holder = holderOf(owner === 'me' ? game : { faction: own.faction ?? game.faction }, own, shared);
    for (const id of inForceOf(pack, holder, effect => effect.stopsPassage !== undefined)) {
      const structures = [...own.docks, ...Object.keys(own.pds).filter(planet => (own.pds[planet] ?? 0) > 0)];
      for (const slot of effectOf(pack, id)!.stopsPassage!({ id, pack, map: game, owner, mover: mover ?? 'me', structures })) barred.add(slot);
    }
  }
  return barred;
}
/** The systems where other players' ships stand, as `blockersOf` has them, without what the other players' components bar. */
export function shipBlockersOf(game: Game, state: Pick<GameState, 'systems' | 'rivals'> | null, mover: string | undefined, pack: DataPack): Set<string> {
  const me = mover === undefined || mover === 'me';
  const rivals = state?.rivals ?? {};
  const blockers = new Set<string>();
  const addShips = (systems: Record<string, UnitCounts>) => {
    for (const [slot, units] of Object.entries(systems)) if (holdsShips(units, pack)) blockers.add(slot);
  };
  if (!me && state) addShips(state.systems);
  for (const [id, rival] of Object.entries(rivals)) if (id !== mover) addShips(rival.systems);
  for (const [slot, byOwner] of Object.entries(game.enemyUnits)) {
    for (const [owner, units] of Object.entries(byOwner)) {
      if (owner !== mover && !(owner in rivals) && holdsShips(units, pack)) blockers.add(slot);
    }
  }
  return blockers;
}
