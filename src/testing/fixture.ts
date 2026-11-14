import { openDB } from 'idb';
import { loadPack } from '../data/loadPack';
import { createGame } from '../domain/newGame';
import type { Entry, Game } from '../domain/types';
import type { SavedGame } from '../game/save';
import { savedOf } from './legacySave';

/** Writes a record straight into the saves, past `saveGame`, as a damaged or foreign save would lie there. */
export async function putRawSave(record: Record<string, unknown>): Promise<void> {
  const d = await openDB('ti4-planner', 1, { upgrade: u => void u.createObjectStore('games', { keyPath: 'id' }) });
  await d.put('games', record);
  d.close();
}

/** A save whose game the schema refuses: its summary reads, its plans are not plans. */
export const brokenSave = (id = 'broken', name = 'Damaged'): Record<string, unknown> => ({
  id, name, faction: 'sol', playerCount: 4, updatedAt: 1,
  game: { ...sampleGame(), id, name, plans: 'not a list' },
});

const pay = { planets: ['a', 'b'], tradeGoods: 1 };

/** A realistic saved game whose first round holds one turn of every kind. */
export const sampleGame = (): SavedGame => savedOf(legacySampleGame());

/** The same game as the old model holds it, for the tests that still start from an old `Game`. */
export function legacySampleGame(): Game {
  const pack = loadPack(['pok']);
  const game = createGame({ expansions: ['pok'], playerCount: 4, faction: Object.keys(pack.factions)[0] }, pack);
  const entries: Entry[] = [
    { id: 'e2', phase: 'strategy', status: 'done', type: 'strategic' },
    { id: 'e1', phase: 'action', status: 'planned', type: 'tactical', systemId: '1,0',
      moves: [{ from: '0,1', units: { carrier: 1, fighter: 2 } }],
      landings: [{ planetId: 'a', units: { infantry: 2 } }], production: { cruiser: 1 }, payment: pay },
    { id: 'e3', phase: 'action', status: 'cancelled', type: 'secondary' },
    { id: 'e4', phase: 'action', status: 'planned', type: 'component', note: 'note' },
    { id: 'e5', phase: 'action', status: 'planned', type: 'pass',
      acts: [{ kind: 'transaction', with: game.opponents[0].id, give: { tradeGoods: 1 }, get: { commodities: 1, components: ['promissory:war_funding'] } }, { kind: 'expedition', sliceId: null, payment: pay }] },
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

/** A save as an earlier version of the app left it: a whole game, without the format mark. */
export function oldFormatSave(id = 'old', name = 'Earlier'): Record<string, unknown> {
  const game = legacySampleGame();
  return { id, name, faction: game.faction, playerCount: game.playerCount, updatedAt: 1, game: { ...game, id, name, format: 'ti4-planner/2', schemaVersion: 6 } };
}
