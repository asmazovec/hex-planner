/**
 * Research (LRR 90): the one place a technology is researched, whether by the Technology card or by the play of a
 * component that says "research". It checks what the rules ask of every research, in the order of the technologies:
 * that it is not owned (90.10), that it can be researched (90.9), that its prerequisites are met (90.12). A component
 * changes the numbers through the points `prerequisites`, `researchTokens` and `researchAsPrimary`, or waives the warning.
 * Gaining a technology is not researching it (90.5) and passes none of this.
 */
import { componentById, ownedBy } from '../components';
import { applied } from '../effects/apply';
import '../effects/points/research';
import { holderOf } from '../effects/registry';
import prerequisitesMissing from '../rules/codes/prerequisitesMissing';
import researchForeign from '../rules/codes/researchForeign';
import researchUnavailable from '../rules/codes/researchUnavailable';
import { violation } from '../rules/registry';
import type { DataPack, Game, GameState, TechDef, TechType, Warning } from '../types';
import { gain } from './holdings';

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
const describe = (symbols: Symbols): string => Object.entries(symbols).filter(([, n]) => n).map(([colour, n]) => `${colour} ×${n}`).join(', ');

const CANNOT = /\bcannot be researched\b/i;
/** Whether the technology's own printed text forbids researching it (Planesplitter and Parasite of the Obsidian). */
export const unresearchable = (pack: DataPack, id: string): boolean =>
  CANNOT.test(pack.originalTexts?.[id] ?? pack.texts[id] ?? '');

/** The tokens a research gives instead of the technology (Propagation); 0 when it is made as usual. */
export const researchTokensOf = (pack: DataPack, game: Pick<Game, 'faction'>, state: GameState, shared: GameState, technology: string): number =>
  applied(pack, holderOf(game, state, shared), 'researchTokens', 0, { technology }).value;

/** The tokens the technologies of an entry give instead of being researched, for the card's free tokens. */
export const researchTokensGiven = (pack: DataPack, game: Pick<Game, 'faction'>, state: GameState, shared: GameState, ids: readonly string[] | undefined): number =>
  (ids ?? []).filter(id => componentById(pack, id)?.kind === 'technology')
    .reduce((sum, id) => sum + researchTokensOf(pack, game, state, shared, id), 0);

export interface ResearchResult {
  /** The technologies that joined the holdings. */
  researched: string[];
  /** The command tokens to distribute for the researches that gave tokens instead. */
  tokens: number;
}

/**
 * Researches the technologies in order for the player whose `state` it is (`shared` is my state, with the laws). Each one
 * sees what the ones before it brought (a primary researches two, the second may rest on the first). `specialties` are
 * planets exhausted for their technology specialty (90.14): each ignores one symbol of its colour, once; a planet not
 * controlled or already exhausted is warned of and ignores nothing (90.15). Pushes warnings; forbids nothing.
 */
export function researchTechnologies(
  game: Game, state: GameState, shared: GameState, ids: readonly string[] | undefined, pack: DataPack, warnings: Warning[],
  specialties: readonly string[] = [],
): ResearchResult {
  const result: ResearchResult = { researched: [], tokens: 0 };
  // The planets named are exhausted from the start of the research; each gives its colours once.
  const spare: TechType[] = [];
  for (const planetId of specialties) {
    if (state.control[planetId] !== 'me') warnings.push(violation('planetNotControlled', { planetId }, 'card'));
    else if (state.exhausted.includes(planetId)) warnings.push(violation('planetExhausted', { planetId }, 'card'));
    else spare.push(...(pack.planets[planetId]?.tech ?? []));
    if (state.control[planetId] === 'me' && !state.exhausted.includes(planetId)) state.exhausted.push(planetId);
  }
  for (const id of ids ?? []) {
    const def = componentById(pack, id);
    if (def?.kind !== 'technology') continue;
    const name = def.name;
    if (state.holdings.technologies.includes(id)) {
      warnings.push(violation('researchOwned', { id, name }));
      continue;
    }
    if (unresearchable(pack, id)) warnings.push(violation(researchUnavailable.code, { id, name }));
    // 90.10: the card comes from the player's own technology deck, which holds only their faction's technologies of the kind.
    if (def.faction !== undefined && !ownedBy(def, game.faction)) warnings.push(violation(researchForeign.code, { id, name }));
    // Propagation: the research is not made and the tokens come instead; nothing else of it is asked.
    const tokens = researchTokensOf(pack, game, state, shared, id);
    if (tokens > 0) { result.tokens += tokens; continue; }
    const lacking = symbolsLacking(pack, id, state.holdings.technologies);
    for (const colour of Object.keys(lacking) as TechType[]) {
      while ((lacking[colour] ?? 0) > 0 && spare.includes(colour)) {
        lacking[colour]! -= 1;
        spare.splice(spare.indexOf(colour), 1);
      }
    }
    const upgrade = techOf(pack, id)?.upgrade !== undefined;
    const missing = applied(pack, holderOf(game, state, shared), 'prerequisites', countSymbols(lacking), { technology: id, upgrade, missing: { ...lacking } }).value;
    if (missing > 0) warnings.push(violation(prerequisitesMissing.code, { id, name, missing, symbols: describe(lacking) }));
    gain(state, shared, def);
    result.researched.push(id);
  }
  return result;
}
