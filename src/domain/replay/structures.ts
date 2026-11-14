/**
 * Structures (LRR 85, 24, 63, 79): whose they are, the limits a planet and the reinforcements set, and what happens to
 * them when a planet changes hands. A structure belongs to the player who controls its planet, so each player's state
 * holds only their own; another player gaining the planet destroys them (49.5.1, 63.4, 79.4).
 */
import type { StructureCounts, StructureKind } from '../types';

/** Most of one kind a planet holds (24 notes 1-2, 63.3, 79.3, 85.4, 85.5). */
export const PER_PLANET: Record<StructureKind, number> = { spacedock: 1, pds: 2 };

const KINDS: StructureKind[] = ['pds', 'spacedock'];
export const kindsOf = (structures: StructureCounts | undefined): StructureKind[] => KINDS.filter(kind => (structures?.[kind] ?? 0) > 0);
