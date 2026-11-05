import type { Entry, Game } from './types';

/** Mecatol Rex and its Thunder's Edge version: tile ids, then planet ids. */
export const MECATOL_TILE = '18';
export const MECATOL_TILE_TE = '112';
export const MECATOL_PLANET = 'mr';
export const MECATOL_PLANET_TE = 'mrte';
export const MECATOL_PLANETS = [MECATOL_PLANET, MECATOL_PLANET_TE];

const toTe = (id: string): string => (id === MECATOL_PLANET ? MECATOL_PLANET_TE : id);

function migrateEntry(entry: Entry): Entry {
  if (entry.type === 'tactical') {
    return {
      ...entry,
      moves: entry.moves.map(move => ({ ...move, from: toTe(move.from) })),
      landings: entry.landings.map(landing => ({ ...landing, planetId: toTe(landing.planetId) })),
      payment: { ...entry.payment, planets: entry.payment.planets.map(toTe) },
    };
  }
  if (entry.type === 'expedition') return { ...entry, payment: { ...entry.payment, planets: entry.payment.planets.map(toTe) } };
  return entry;
}

/**
 * Thunder's Edge replaces the Mecatol Rex tile in the centre. For a game in progress, the centre tile changes and
 * everything recorded on the planet `mr` (control, owner, docks, and the planets named by entries of every plan) moves to
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
    plans: game.plans.map(plan => ({
      ...plan,
      rounds: plan.rounds.map(round => ({ ...round, entries: round.entries.map(migrateEntry) })),
    })),
  };
}
