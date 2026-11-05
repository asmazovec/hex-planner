import type { TileDef } from './types';

/**
 * Thunder's Edge goes into a system with no planet, no supernova and no printed wormhole (TE rules).
 * Hyperlanes, home systems and Fracture systems are not candidates.
 */
export function validThundersEdgeSystem(tile: TileDef): boolean {
  return tile.kind === 'system'
    && tile.planetIds.length === 0
    && tile.wormholes.length === 0
    && tile.anomaly !== 'supernova'
    && tile.secondAnomaly !== 'supernova';
}
