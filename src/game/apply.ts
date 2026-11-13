/**
 * The one place a board changes. `apply` is pure: it returns a new board and shares what did not change. It never
 * judges a rule, and it never lets a count go below zero without saying so: an impossible event is carried out as far as
 * it can be (the clamp) and the rest is reported as a `Shortfall`, which the resolver turns into a violation.
 */
import { emptyPlayer } from './board';
import {
  negate, patchBoard, patchCommon, patchPlanet, patchPlayer, patchSystem, shiftCounts, takable,
} from './draft';
import type { GameEvent, Place } from './events';
import type {
  Board, CardHold, ComponentId, PlayerId, StructureCounts, UnitCounts,
} from './types';

/** What an event asked for and the board could not give. */
export interface Shortfall {
  what: 'units' | 'structures' | 'tokens' | 'tradeGoods' | 'commodities' | 'points' | 'card' | 'owner' | 'strategy' | 'law';
  player?: PlayerId;
  /** The slot or planet it was taken from. */
  where?: string;
  /** The unit, structure, pool or component that fell short. */
  key: string;
  missing: number;
}

export interface Applied { board: Board; shortfall?: Shortfall[] }

const placeKey = (at: Place): string => ('slot' in at ? at.slot : at.planet);

const unitsAt = (board: Board, player: PlayerId, at: Place): UnitCounts =>
  ('slot' in at ? board.systems[at.slot]?.ships[player] : board.planets[at.planet]?.ground[player]) ?? {};

const structuresAt = (board: Board, player: PlayerId, at: Place): StructureCounts => {
  if ('slot' in at) return board.systems[at.slot]?.afloat[player] ?? {};
  const planet = board.planets[at.planet];
  return planet?.owner === player ? planet.structures : {};
};

/** Units change at a place by a signed amount; the caller has already clamped a removal. */
function shiftUnits(board: Board, player: PlayerId, at: Place, delta: UnitCounts): Board {
  const change = (units: UnitCounts) => shiftCounts(units, delta).counts;
  return 'slot' in at
    ? patchSystem(board, at.slot, s => ({ ...s, ships: { ...s.ships, [player]: change(s.ships[player] ?? {}) } }))
    : patchPlanet(board, at.planet, p => ({ ...p, ground: { ...p.ground, [player]: change(p.ground[player] ?? {}) } }));
}

/** Structures change the same way; one lands on a planet only if its player holds it (a structure has no owner of its own). */
function shiftStructures(board: Board, player: PlayerId, at: Place, delta: StructureCounts): Board {
  const change = (structures: StructureCounts) => shiftCounts(structures, delta).counts;
  return 'slot' in at
    ? patchSystem(board, at.slot, s => ({ ...s, afloat: { ...s.afloat, [player]: change(s.afloat[player] ?? {}) } }))
    : patchPlanet(board, at.planet, p => ({ ...p, structures: change(p.structures) }));
}

function holdOf(board: Board, player: PlayerId, card: ComponentId): CardHold | undefined {
  return board.players[player]?.cards[card];
}

function setHold(board: Board, player: PlayerId, card: ComponentId, hold: CardHold | undefined): Board {
  return patchPlayer(board, player, p => {
    const { [card]: gone, ...rest } = p.cards;
    void gone;
    return { ...p, cards: hold ? { ...rest, [card]: hold } : rest };
  });
}

/** Carries the event out on a copy of the board; `out` collects what could not be done. */
function step(board: Board, event: GameEvent, out: Shortfall[]): Board {
  const missing = (what: Shortfall['what'], key: string, n: number, player?: PlayerId, where?: string): void => {
    out.push({ what, ...(player === undefined ? {} : { player }), ...(where === undefined ? {} : { where }), key, missing: n });
  };
  /** Removes up to `wanted` of units or structures at a place, reports the rest, and returns what was taken. */
  const take = <T extends UnitCounts | StructureCounts>(
    what: 'units' | 'structures', player: PlayerId, at: Place, wanted: T, there: T,
  ): T => {
    const taken = takable(there as Record<string, number>, wanted as Record<string, number>) as T;
    for (const key of Object.keys(wanted)) {
      const gap = ((wanted as Record<string, number>)[key] ?? 0) - ((taken as Record<string, number>)[key] ?? 0);
      if (gap > 0) missing(what, key, gap, player, placeKey(at));
    }
    return taken;
  };
  const cardChange = (player: PlayerId, card: ComponentId, change: (hold: CardHold) => CardHold | undefined): Board => {
    const hold = holdOf(board, player, card);
    if (!hold) { missing('card', card, 1, player); return board; }
    return setHold(board, player, card, change(hold));
  };

  switch (event.type) {
    case 'RoundStarted': {
      const players = Object.fromEntries(Object.entries(board.players).map(([id, p]) => [id, { ...p, strategy: [], passed: false }]));
      const { active, ...rest } = board;
      void active;
      return { ...rest, round: event.round, phase: 'strategy', players };
    }
    case 'PhaseStarted': {
      const { active, ...rest } = board;
      void active;
      return { ...rest, phase: event.phase };
    }
    case 'TurnStarted': return patchBoard(board, { active: event.player });
    case 'TurnEnded': {
      if (board.active !== event.player) return board;
      const { active, ...rest } = board;
      void active;
      return rest;
    }
    case 'Passed': return patchPlayer(board, event.player, p => (p.passed ? p : { ...p, passed: true }));

    case 'UnitsPlaced': return shiftUnits(board, event.player, event.at, event.units);
    case 'UnitsRemoved': {
      const taken = take('units', event.player, event.at, event.units, unitsAt(board, event.player, event.at));
      return shiftUnits(board, event.player, event.at, negate(taken));
    }
    case 'UnitsMoved': {
      const taken = take('units', event.player, event.from, event.units, unitsAt(board, event.player, event.from));
      return shiftUnits(shiftUnits(board, event.player, event.from, negate(taken)), event.player, event.to, taken);
    }
    case 'StructurePlaced': {
      if ('planet' in event.at && board.planets[event.at.planet]?.owner !== event.player) {
        for (const key of Object.keys(event.structures)) missing('owner', key, event.structures[key as keyof StructureCounts] ?? 0, event.player, event.at.planet);
        return board;
      }
      return shiftStructures(board, event.player, event.at, event.structures);
    }
    case 'StructureRemoved': {
      const taken = take('structures', event.player, event.at, event.structures, structuresAt(board, event.player, event.at));
      return shiftStructures(board, event.player, event.at, negate(taken));
    }
    case 'StructureMoved': {
      const taken = take('structures', event.player, event.from, event.structures, structuresAt(board, event.player, event.from));
      if ('planet' in event.to && board.planets[event.to.planet]?.owner !== event.player) {
        for (const key of Object.keys(taken)) missing('owner', key, taken[key as keyof StructureCounts] ?? 0, event.player, event.to.planet);
        return board;
      }
      return shiftStructures(shiftStructures(board, event.player, event.from, negate(taken)), event.player, event.to, taken);
    }

    case 'PlanetGained':
      return patchPlanet(board, event.planet, p => (p.owner === event.player ? p : { ...p, owner: event.player, structures: {} }));
    case 'PlanetLost':
      return patchPlanet(board, event.planet, p => {
        const { owner, ...rest } = p;
        return owner === undefined ? p : { ...rest, structures: {} };
      });
    case 'PlanetExhausted': return patchPlanet(board, event.planet, p => (p.exhausted ? p : { ...p, exhausted: true }));
    case 'PlanetReadied': return patchPlanet(board, event.planet, p => (p.exhausted ? { ...p, exhausted: false } : p));
    case 'CardAttached':
      return patchPlanet(board, event.planet, p => (p.attached.includes(event.card) ? p : { ...p, attached: [...p.attached, event.card] }));

    case 'SystemActivated':
      return patchSystem(board, event.system, s => (s.tokens.includes(event.player) ? s : { ...s, tokens: [...s.tokens, event.player] }));
    case 'TokensChanged': {
      const { counts, short } = shiftCounts({ ...board.players[event.player]?.pools }, event.delta);
      for (const [pool, n] of short) missing('tokens', pool, n, event.player);
      return patchPlayer(board, event.player, p => ({
        ...p, pools: { tactic: counts.tactic ?? 0, fleet: counts.fleet ?? 0, strategy: counts.strategy ?? 0 },
      }));
    }
    case 'TokenReturned': {
      const slots = event.system === undefined ? Object.keys(board.systems) : [event.system];
      return slots.reduce((next, slot) => {
        if (!next.systems[slot]?.tokens.includes(event.player)) return next;
        return patchSystem(next, slot, s => ({ ...s, tokens: s.tokens.filter(id => id !== event.player) }));
      }, board);
    }

    case 'TradeGoodsChanged':
    case 'CommoditiesChanged': {
      const key = event.type === 'TradeGoodsChanged' ? 'tradeGoods' : 'commodities';
      const have = board.players[event.player]?.[key] ?? 0;
      if (have + event.delta < 0) missing(key, key, -(have + event.delta), event.player);
      return patchPlayer(board, event.player, p => ({ ...p, [key]: Math.max(0, have + event.delta) }));
    }
    case 'GoodsTransferred': {
      const from = board.players[event.from] ?? emptyPlayer();
      const goods = Math.min(event.tradeGoods ?? 0, from.tradeGoods);
      const commodities = Math.min(event.commodities ?? 0, from.commodities);
      if ((event.tradeGoods ?? 0) > goods) missing('tradeGoods', 'tradeGoods', (event.tradeGoods ?? 0) - goods, event.from);
      if ((event.commodities ?? 0) > commodities) missing('commodities', 'commodities', (event.commodities ?? 0) - commodities, event.from);
      const cards = (event.cards ?? []).filter(id => {
        const held = holdOf(board, event.from, id) !== undefined;
        if (!held) missing('card', id, 1, event.from);
        return held;
      });
      let next = patchPlayer(board, event.from, p => ({ ...p, tradeGoods: p.tradeGoods - goods, commodities: p.commodities - commodities }));
      // Commodities that change hands become trade goods for the receiver (LRR 94).
      next = patchPlayer(next, event.to, p => ({ ...p, tradeGoods: p.tradeGoods + goods + commodities }));
      for (const id of cards) {
        const hold = holdOf(next, event.from, id) as CardHold;
        next = setHold(next, event.from, id, hold.count > 1 ? { ...hold, count: hold.count - 1 } : undefined);
        const there = holdOf(next, event.to, id);
        next = setHold(next, event.to, id, there ? { ...there, count: there.count + 1 } : { state: 'ready', count: 1 });
      }
      return next;
    }

    case 'CardGained': {
      const there = holdOf(board, event.player, event.card);
      const count = event.count ?? 1;
      return setHold(board, event.player, event.card, there ? { ...there, count: there.count + count } : { state: event.state ?? 'ready', count });
    }
    case 'TechnologyResearched':
      return holdOf(board, event.player, event.technology) ? board : setHold(board, event.player, event.technology, { state: 'ready', count: 1 });
    case 'CardLost':
      return cardChange(event.player, event.card, hold => {
        const count = event.count ?? 1;
        if (hold.count < count) missing('card', event.card, count - hold.count, event.player);
        return hold.count > count ? { ...hold, count: hold.count - count } : undefined;
      });
    case 'CardExhausted': return cardChange(event.player, event.card, hold => ({ ...hold, state: 'exhausted' }));
    case 'CardReadied': return cardChange(event.player, event.card, hold => (hold.state === 'exhausted' ? { ...hold, state: 'ready' } : hold));
    case 'CardUnlocked': return cardChange(event.player, event.card, hold => (hold.state === 'locked' ? { ...hold, state: 'ready' } : hold));
    case 'CardPurged': return cardChange(event.player, event.card, hold => ({ ...hold, state: 'purged' }));

    case 'ObjectiveRevealed':
      return patchCommon(board, c => (c.revealed.includes(event.objective) ? c : { ...c, revealed: [...c.revealed, event.objective] }));
    case 'ObjectiveScored': return setHold(board, event.player, event.objective, { state: 'inPlay', count: 1 });
    case 'PointsChanged': {
      const have = board.players[event.player]?.vp ?? 0;
      if (have + event.delta < 0) missing('points', 'vp', -(have + event.delta), event.player);
      return patchPlayer(board, event.player, p => ({ ...p, vp: Math.max(0, have + event.delta) }));
    }
    case 'LawEnacted':
      return patchCommon(board, c => (c.laws.some(l => l.id === event.law) ? c
        : { ...c, laws: [...c.laws, event.elected === undefined ? { id: event.law } : { id: event.law, elected: event.elected }] }));
    case 'LawDiscarded': {
      if (!board.common.laws.some(l => l.id === event.law)) missing('law', event.law, 1);
      const cleared = Object.keys(board.planets).reduce(
        (next, id) => (next.planets[id].attached.includes(event.law)
          ? patchPlanet(next, id, p => ({ ...p, attached: p.attached.filter(c => c !== event.law) })) : next),
        board,
      );
      return patchCommon(cleared, c => ({ ...c, laws: c.laws.filter(l => l.id !== event.law) }));
    }

    case 'SpeakerChanged': return board.speaker === event.player ? board : patchBoard(board, { speaker: event.player });
    case 'StrategyCardPicked':
      return patchPlayer(board, event.player, p => (p.strategy.some(s => s.card === event.card) ? p
        : { ...p, strategy: [...p.strategy, { card: event.card, played: false }] }));
    case 'StrategyCardPlayed': {
      if (!board.players[event.player]?.strategy.some(s => s.card === event.card)) missing('strategy', String(event.card), 1, event.player);
      return patchPlayer(board, event.player, p => ({ ...p, strategy: p.strategy.map(s => (s.card === event.card ? { ...s, played: true } : s)) }));
    }

    case 'CustodiansRemoved': return patchCommon(board, c => (c.custodians ? { ...c, custodians: false } : c));
    case 'ExpeditionSliceTaken': return patchCommon(board, c => ({ ...c, expedition: { ...c.expedition, [event.slice]: event.player } }));
    case 'FractureOpened': return patchCommon(board, c => ({ ...c, fracture: { open: true, tiles: { ...event.tiles } } }));
    case 'WormholeTokenPlaced':
      return patchCommon(board, c => {
        const here = c.wormholeTokens[event.system] ?? [];
        return here.includes(event.wormhole) ? c : { ...c, wormholeTokens: { ...c.wormholeTokens, [event.system]: [...here, event.wormhole] } };
      });
    default: {
      const never: never = event;
      return never;
    }
  }
}

/** One event on a board, with what it could not do. */
export function applyChecked(board: Board, event: GameEvent): Applied {
  const shortfall: Shortfall[] = [];
  const next = step(board, event, shortfall);
  return shortfall.length > 0 ? { board: next, shortfall } : { board: next };
}

export const apply = (board: Board, event: GameEvent): Board => applyChecked(board, event).board;

export const applyAll = (board: Board, events: readonly GameEvent[]): Board => events.reduce(apply, board);
