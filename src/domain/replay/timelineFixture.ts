/** A long game for the timeline's tests and bench: six players, every kind of entry in each round. */
import { loadPack } from '../../data/loadPack';
import { seatSlots } from '../mapBuilder';
import { createGame } from '../../testing/old/domain/newGame';
import { placeStartUnits, setPlayerFaction } from '../../testing/old/domain/players';
import type { Entry, Game, Round } from '../types';

export const fixturePack = loadPack(['pok', 'te']);
const FACTIONS = ['sol', 'arborec', 'hacan', 'letnev', 'saar', 'muaat'];
const noPay = { planets: [], tradeGoods: 0 };

export function longGame(rounds = 6, turns = 3): Game {
  let game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: '' }, fixturePack);
  FACTIONS.forEach((faction, i) => { game = setPlayerFaction(game, i, faction, fixturePack); });
  game = placeStartUnits(game, fixturePack);
  const seats = seatSlots(6, fixturePack, game.layout);
  const home = seats[game.seat - 1];
  const slots = Object.keys(game.map).filter(slot => !seats.includes(slot));
  const made: Round[] = Array.from({ length: rounds }, (_, r) => {
    const id = (n: string) => `r${r + 1}-${n}`;
    const entries: Entry[] = [{ id: id('card'), phase: 'action', status: 'done', type: 'strategic', card: (r % 8) + 1 }];
    for (let t = 0; t < turns; t++) {
      const target = slots[(r * turns + t) % slots.length];
      entries.push({
        id: id(`mine${t}`), phase: 'action', status: t === 0 ? 'done' : 'planned', type: 'tactical', systemId: target,
        moves: [{ from: home, units: { carrier: 1, infantry: 1 } }], landings: [], production: {}, payment: noPay,
        acts: t === 1 ? [{ kind: 'transaction', with: game.opponents[0].id, give: { tradeGoods: 1 }, get: { commodities: 1 } }] : [],
      });
      for (const rival of game.opponents.slice(0, 3)) {
        entries.push({
          id: id(`${rival.id}-${t}`), phase: 'action', status: 'planned', type: 'tactical', owner: rival.id,
          systemId: slots[(r * turns + t + rival.seat * 5) % slots.length],
          moves: [{ from: seats[rival.seat - 1], units: { cruiser: 1 } }], landings: [], production: {}, payment: noPay,
        });
      }
    }
    entries.push({ id: id('fix'), phase: 'action', status: 'planned', type: 'adjustment', label: 'ability', delta: { tradeGoods: 2, units: { systemId: home, units: { carrier: 1, infantry: 2, cruiser: 1 } } } });
    entries.push({ id: id('pass'), phase: 'action', status: 'planned', type: 'pass' });
    entries.push({ id: id('status'), phase: 'status', status: 'planned', type: 'statusTokens', tactic: 1, fleet: 1, strategy: 0, vp: 1 });
    return { number: r + 1, strategyCard: (r % 8) + 1, backupCard: null, entries };
  });
  return { ...game, plans: [{ ...game.plans[0], rounds: made }] };
}

/** The game with one round of its plan rewritten; every other round keeps its object, as the store keeps it. */
export function editRound(game: Game, number: number, edit: (round: Round) => Round): Game {
  return { ...game, plans: game.plans.map(plan => ({ ...plan, rounds: plan.rounds.map(r => (r.number === number ? edit(r) : r)) })) };
}
