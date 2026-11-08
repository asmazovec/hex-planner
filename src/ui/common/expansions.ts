import type { ExpansionId } from '../../domain/types';

/** The names of the expansions; game names stay in English in both languages. */
export const EXPANSION_NAMES: Record<ExpansionId, string> = { pok: 'Prophecy of Kings', te: "Thunder's Edge" };

/** The expansions in the order the interface lists them. */
export const EXPANSIONS = Object.keys(EXPANSION_NAMES) as ExpansionId[];
