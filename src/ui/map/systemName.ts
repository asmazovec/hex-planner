import { systemNameOf } from '../../domain/systemName';
import type { DataPack, Game } from '../../domain/types';

/** The letters the tiles print for their wormholes. */
export const WORMHOLE_SIGNS: Record<string, string> = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε' };

/** Printed tile number of a slot, for the places that speak of the tile on the table. */
export function systemName(game: Game, pack: DataPack, slot: string): string {
  return systemNameOf(game, pack, slot).number;
}

/**
 * The name the player knows a system by: its planets («Rigel I / Rigel II / Rigel III»), or, with none, what the map
 * writes on it and its tile number («Empty (78)», «Wormhole α (39)»).
 */
export function systemTitle(game: Game, pack: DataPack, slot: string, t: (key: string) => string): string {
  const { planets, number, kind, anomalies, wormholes } = systemNameOf(game, pack, slot);
  if (planets.length > 0) return planets.join(' / ');
  if (kind === null) return number;
  const label = anomalies.length > 0 ? anomalies.map(a => t(`map.anomaly.${a}`)).join(' + ')
    : kind === 'hyperlane' ? t('map.hyperlane')
      : wormholes.length > 0 ? `${t('map.wormhole')} ${wormholes.map(w => WORMHOLE_SIGNS[w] ?? w).join(' ')}` : t('map.emptySystem');
  return `${label} (${number})`;
}
