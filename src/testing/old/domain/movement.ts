import type { DataPack, UnitCounts } from '../../../domain/types';
import type { Game } from './types';
import type { GameState } from './types';
import { inForceOf, effectOf } from '../../../domain/effects/registry';
import { holderOf } from './effects/holder';
import { holdsShips, linksFrom, type Link, type MoveAt } from '../../../domain/movement';
import { planetsOf } from '../../../domain/replay/board';
import type { Holder } from '../../../domain/effects/registry';
import type { Kept, SharedOf } from './effects/holder';
import { homeSlot } from './strategy';

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

// ---------------------------------------------------------------------------------------------------------------------
// What the counting of a move reads of the old per-player state.

/** The wormhole tokens put on the map during the game: the token's type, then the slot. */
export interface WormholeTokens { readonly wormholeTokens?: Readonly<Record<string, string>> }
/** A player who moves: their cards, control and laws, the docks on their planets and the tokens of the game as they hold them. */
export type Moving = Kept & WormholeTokens & { readonly docks: readonly string[] };
/** The laws and tokens of the whole game, as the mover's shared view keeps them. */
export type MoveShared = SharedOf & WormholeTokens;

/** What a component of the mover reads of the board, over the old per-player state. */
export const atOfState = (game: Game, pack: DataPack, state: Moving, shared?: MoveShared): MoveAt => ({
  map: game, tokens: (shared ?? state).wormholeTokens as Record<string, string> | undefined,
  get home() { return homeSlot(game, pack); },
  dockIn: slot => planetsOf(game, slot, pack).some(planetId => state.docks.includes(planetId)),
});

/** Who asks for the adjacency beyond the board. */
export interface LinkWho { holder?: Holder; state?: Moving; shared?: MoveShared; named?: readonly string[]; during: 'tactical' | 'neighbors' }

/**
 * The adjacency the board does not draw: the wormhole tokens of the game and what the components of the player join
 * (in force, or named by the entry). Empty for a board that has none, so the cached graph is used as it is.
 */
export function linksOf(game: Game, pack: DataPack, who: LinkWho): Link[] {
  const holder = who.holder ?? (who.state ? holderOf(game, who.state, who.shared) : undefined);
  return linksFrom(game, pack, {
    ...(holder ? { holder } : {}), faction: game.faction, controls: planetId => who.state?.control?.[planetId] === 'me',
    tokens: (who.shared ?? who.state)?.wormholeTokens as Record<string, string> | undefined, ...(who.named ? { named: who.named } : {}), during: who.during,
  });
}

