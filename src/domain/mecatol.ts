import type { Entry, Game } from './types';

/** Mecatol Rex and its Thunder's Edge version: tile ids, then planet ids. */
export const MECATOL_TILE = '18';
export const MECATOL_TILE_TE = '112';
export const MECATOL_PLANET = 'mr';
export const MECATOL_PLANET_TE = 'mrte';
export const MECATOL_PLANETS = [MECATOL_PLANET, MECATOL_PLANET_TE];

/** The influence that removes the custodians token (27.2). */
export const CUSTODIANS_COST = 6;

const toTe = (id: string): string => (id === MECATOL_PLANET ? MECATOL_PLANET_TE : id);

function migrateEntry(entry: Entry): Entry {
  if (entry.type === 'tactical') {
    return {
      ...entry,
      moves: entry.moves.map(move => ({ ...move, from: toTe(move.from) })),
      landings: entry.landings.map(landing => ({ ...landing, planetId: toTe(landing.planetId) })),
      payment: { ...entry.payment, planets: entry.payment.planets.map(toTe) },
      ...(entry.groundLosses ? { groundLosses: Object.fromEntries(Object.entries(entry.groundLosses).map(([id, units]) => [toTe(id), units])) } : {}),
      ...(entry.productionGround ? { productionGround: Object.fromEntries(Object.entries(entry.productionGround).map(([id, units]) => [toTe(id), units])) } : {}),
    };
  }
  if ((entry.type === 'strategic' || entry.type === 'secondary') && entry.effects) {
    const { payment, readied, structures, production } = entry.effects;
    return {
      ...entry,
      effects: {
        ...entry.effects,
        ...(payment ? { payment: { ...payment, planets: payment.planets.map(toTe) } } : {}),
        ...(readied ? { readied: readied.map(toTe) } : {}),
        ...(structures ? { structures: structures.map(s => ({ ...s, planetId: toTe(s.planetId) })) } : {}),
        ...(production?.ground ? { production: { ...production, ground: Object.fromEntries(Object.entries(production.ground).map(([id, units]) => [toTe(id), units])) } } : {}),
      },
    };
  }
  if (entry.type === 'adjustment' && entry.delta.ground) {
    return { ...entry, delta: { ...entry.delta, ground: Object.fromEntries(Object.entries(entry.delta.ground).map(([id, units]) => [toTe(id), units])) } };
  }
  return entry;
}

/**
 * Thunder's Edge replaces the Mecatol Rex tile in the centre. For a game in progress, the centre tile changes and
 * everything recorded on the planet `mr` (control, owner, docks, PDS, enemy ground forces, and the planets named by entries of every plan) moves to
 * `mrte`, so that it is still drawn.
 */
export function withTeMecatol(game: Game): Game {
  const map = game.map['0,0'] === MECATOL_TILE ? { ...game.map, '0,0': MECATOL_TILE_TE } : game.map;
  const planetControl = Object.fromEntries(Object.entries(game.planetControl).map(([id, owner]) => [toTe(id), owner]));
  const planetOwner = Object.fromEntries(Object.entries(game.planetOwner).map(([id, owner]) => [toTe(id), owner]));
  return {
    ...game,
    map,
    planetControl,
    planetOwner,
    docks: game.docks.map(toTe),
    pds: Object.fromEntries(Object.entries(game.pds).map(([id, count]) => [toTe(id), count])),
    enemyGround: Object.fromEntries(Object.entries(game.enemyGround).map(([id, byOwner]) => [toTe(id), byOwner])),
    plans: game.plans.map(plan => ({
      ...plan,
      rounds: plan.rounds.map(round => ({ ...round, entries: round.entries.map(migrateEntry) })),
    })),
  };
}
