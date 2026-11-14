/**
 * Research (LRR 90): the one place a technology is researched, whether by the Technology card or by the play of a
 * component that says "research". It checks what the rules ask of every research, in the order of the technologies:
 * that it is not owned (90.10), that it can be researched (90.9), that its prerequisites are met (90.12). A component
 * changes the numbers through the points `prerequisites`, `researchTokens` and `researchAsPrimary`, or waives the warning.
 * Gaining a technology is not researching it (90.5) and passes none of this.
 */
import '../effects/points/research';
import type { DataPack, TechDef, TechType } from '../types';

export type Symbols = Partial<Record<TechType, number>>;

const PREFIX = 'technology:';

/** The pack's card of a technology component id. */
export const techOf = (pack: DataPack, id: string): TechDef | undefined =>
  id.startsWith(PREFIX) ? pack.technologies[id.slice(PREFIX.length)] : undefined;

/** The colour a technology gives toward prerequisites: none for a unit upgrade (90.12.2) or a card with no colour. */
export const colourOf = (pack: DataPack, id: string): TechType | null => {
  const def = techOf(pack, id);
  return def && !def.upgrade ? def.type : null;
};

/** How many technologies of each colour a player owns. */
export function coloursOwned(pack: DataPack, technologies: readonly string[]): Symbols {
  const owned: Symbols = {};
  for (const id of technologies) {
    const colour = colourOf(pack, id);
    if (colour) owned[colour] = (owned[colour] ?? 0) + 1;
  }
  return owned;
}

/** The prerequisite symbols of a technology that the technologies owned do not cover (90.8.1, 90.12). */
export function symbolsLacking(pack: DataPack, id: string, technologies: readonly string[]): Symbols {
  const owned = coloursOwned(pack, technologies);
  const lacking: Symbols = {};
  for (const [colour, need] of Object.entries(techOf(pack, id)?.requires ?? {}) as [TechType, number][]) {
    const short = need - (owned[colour] ?? 0);
    if (short > 0) lacking[colour] = short;
  }
  return lacking;
}

export const countSymbols = (symbols: Symbols): number => Object.values(symbols).reduce((sum, n) => sum + (n ?? 0), 0);
export const describe = (symbols: Symbols): string => Object.entries(symbols).filter(([, n]) => n).map(([colour, n]) => `${colour} ×${n}`).join(', ');

const CANNOT = /\bcannot be researched\b/i;
/** Whether the technology's own printed text forbids researching it (Planesplitter and Parasite of the Obsidian). */
export const unresearchable = (pack: DataPack, id: string): boolean =>
  CANNOT.test(pack.originalTexts?.[id] ?? pack.texts[id] ?? '');

export interface ResearchResult {
  /** The technologies that joined the holdings. */
  researched: string[];
  /** The command tokens to distribute for the researches that gave tokens instead. */
  tokens: number;
}
