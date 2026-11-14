import type { Entry, Game } from './types';

/** An entry whose slot keys go through `to`: the active system, the sources and routes of moves, the card and adjustment systems. */
export function movedEntry(entry: Entry, to: (slot: string) => string): Entry {
  if (entry.type === 'tactical') {
    return {
      ...entry,
      systemId: entry.systemId === null ? null : to(entry.systemId),
      moves: entry.moves.map(move => ({
        ...move, from: to(move.from),
        ...(move.via ? { via: move.via.map(to) } : {}),
        ...(move.pickupOf === undefined ? {} : { pickupOf: to(move.pickupOf) }),
      })),
    };
  }
  if (entry.type === 'strategic' || entry.type === 'secondary') {
    const { effects } = entry;
    if (!effects) return entry;
    return {
      ...entry,
      effects: {
        ...effects,
        ...(effects.systemId === undefined ? {} : { systemId: to(effects.systemId) }),
        ...(effects.production ? { production: { ...effects.production, systemId: to(effects.production.systemId) } } : {}),
      },
    };
  }
  if (entry.type === 'adjustment' && entry.delta.units) {
    return { ...entry, delta: { ...entry.delta, units: { ...entry.delta.units, systemId: to(entry.delta.units.systemId) } } };
  }
  return entry;
}
/**
 * The game with what it says about systems moved to other slots: enemy units, the Fracture's ingress and the plans,
 * which speak of a system by its slot. The map itself is left to the caller. `to` must not send two slots to one.
 */
export function withSlotsMoved(game: Game, to: (slot: string) => string): Game {
  return {
    ...game,
    enemyUnits: Object.fromEntries(Object.entries(game.enemyUnits).map(([slot, units]) => [to(slot), units])),
    fracture: { ...game.fracture, ingress: game.fracture.ingress.map(to) },
    plans: game.plans.map(plan => ({
      ...plan,
      rounds: plan.rounds.map(round => ({ ...round, entries: round.entries.map(entry => movedEntry(entry, to)) })),
    })),
  };
}
