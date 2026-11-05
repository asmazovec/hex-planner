import { loadPack } from '../data/loadPack';
import { createGame } from '../domain/newGame';
import type { Entry, Game } from '../domain/types';

const pay = { planets: ['a', 'b'], tradeGoods: 1 };

/** A realistic game whose first round holds one entry of every body variant. */
export function sampleGame(): Game {
  const pack = loadPack(['pok']);
  const game = createGame({ expansions: ['pok'], playerCount: 4, faction: Object.keys(pack.factions)[0] }, pack);
  const entries: Entry[] = [
    { id: 'e1', phase: 'action', status: 'planned', type: 'tactical', systemId: '1,0',
      moves: [{ from: '0,1', units: { carrier: 1, fighter: 2 } }],
      landings: [{ planetId: 'a', units: { infantry: 2 } }], production: { cruiser: 1 }, payment: pay },
    { id: 'e2', phase: 'strategy', status: 'done', type: 'strategic' },
    { id: 'e3', phase: 'action', status: 'cancelled', type: 'secondary' },
    { id: 'e4', phase: 'action', status: 'planned', type: 'component', note: 'note' },
    { id: 'e5', phase: 'action', status: 'planned', type: 'pass' },
    { id: 'e6', phase: 'action', status: 'planned', type: 'expedition', sliceId: null, payment: pay },
    { id: 'e7', phase: 'status', status: 'done', type: 'adjustment', label: 'ability',
      delta: { tradeGoods: -1, vp: 1, units: { systemId: '1,0', units: { mech: 1 } } } },
    { id: 'e8', phase: 'status', status: 'planned', type: 'statusTokens', tactic: 3, fleet: 2, strategy: 1 },
  ];
  game.plans[0].rounds[0].entries = entries;
  game.plans[0].rounds[0].strategyCard = 3;
  game.enemyUnits = { '1,0': { [game.opponents[0].id]: { dreadnought: 2 } } };
  game.expedition = { slices: { s1: 'me', s2: null }, thundersEdgeSystem: '1,0' };
  return game;
}

/** The same game as schema version 1 saved it: opponents without ids, enemy units and enemy planets without an owner. */
export function gameOfSchema1(): Record<string, unknown> {
  const { planetOwner, opponents, ...rest } = sampleGame();
  void planetOwner;
  return {
    ...rest,
    schemaVersion: 1,
    opponents: opponents.map(({ faction, vp, seat, color }) => ({ faction, vp, seat, color })),
    enemyUnits: { '1,0': { dreadnought: 2 }, '0,1': { fighter: 3 } },
    planetControl: { jord: 'me', arc: 'enemy', lazar: 'enemy' },
  };
}
