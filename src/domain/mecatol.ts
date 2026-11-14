import type { Game } from './types';

/** Mecatol Rex and its Thunder's Edge version: tile ids, then planet ids. */
export const MECATOL_TILE = '18';
export const MECATOL_TILE_TE = '112';
export const MECATOL_PLANET = 'mr';
export const MECATOL_PLANET_TE = 'mrte';
export const MECATOL_PLANETS = [MECATOL_PLANET, MECATOL_PLANET_TE];
export const isMecatol = (planetId: string): boolean => MECATOL_PLANETS.includes(planetId);
/** The planet id of Mecatol Rex that stands on this map: the Thunder's Edge one when its tile is in the centre. */
export const mecatolPlanetOf = (game: Pick<Game, 'map'>): string => (Object.values(game.map).some(tile => tile.split('@')[0] === MECATOL_TILE_TE) ? MECATOL_PLANET_TE : MECATOL_PLANET);

/** The influence that removes the custodians token (27.2). */
export const CUSTODIANS_COST = 6;

export const toTe = (id: string): string => (id === MECATOL_PLANET ? MECATOL_PLANET_TE : id);
