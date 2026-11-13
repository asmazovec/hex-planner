import type { DataPack } from './types';

/**
 * The structures a faction starts with (its sheet: `startStructures`), as the game keeps them: the dock as a planet id
 * and the PDS as counts by planet. All stand on the first planet of the home tile. With several home planets which one
 * holds them is the player's choice at the table; the Setup mode of the big hex moves them, so the planner does not ask.
 */
export function startStructures(faction: string, pack: DataPack): { docks: string[]; pds: Record<string, number> } {
  const def = pack.factions[faction];
  const [first] = pack.tiles[def?.homeTile ?? '']?.planetIds ?? [];
  if (!def || first === undefined) return { docks: [], pds: {} };
  const { spacedock = 0, pds = 0 } = def.startStructures ?? {};
  return { docks: spacedock > 0 ? [first] : [], pds: pds > 0 ? { [first]: pds } : {} };
}
