/** The board a game begins from: nobody has anything yet, not even tokens: `setup` brings what the rules and the faction sheets give. */
import type { Board, PlanetState, PlayerState, SystemState, Table } from './types';

/** The command tokens a player starts with in each pool (LRR 20.2); `setup` hands them out. */
export const START_POOLS = { tactic: 3, fleet: 3, strategy: 2 } as const;

export const emptyPlayer = (): PlayerState => ({
  pools: { tactic: 0, fleet: 0, strategy: 0 }, tradeGoods: 0, commodities: 0, vp: 0, cards: {}, strategy: [], passed: false,
});

export const emptySystem = (): SystemState => ({ ships: {}, tokens: [], afloat: {} });

export const emptyPlanet = (): PlanetState => ({ exhausted: false, ground: {}, structures: {}, attached: [] });

/** The speaker is the first player until a game says otherwise. */
export function emptyBoard(table: Table): Board {
  return {
    round: 1, phase: 'strategy', speaker: table.players[0]?.id ?? '',
    players: Object.fromEntries(table.players.map(p => [p.id, emptyPlayer()])),
    systems: {}, planets: {},
    common: { laws: [], revealed: [], custodians: true, expedition: {}, fracture: { open: false, tiles: {} }, wormholeTokens: {} },
  };
}
