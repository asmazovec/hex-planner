import { componentById, ownedBy } from '../../../../domain/components';
import { applied } from '../../../../domain/effects/apply';
import { holderOf } from '../../../../domain/effects/registry';
import prerequisitesMissing from '../../../../domain/rules/codes/prerequisitesMissing';
import researchForeign from '../../../../domain/rules/codes/researchForeign';
import researchUnavailable from '../../../../domain/rules/codes/researchUnavailable';
import { violation } from '../../../../domain/rules/registry';
import type { DataPack, TechType, Warning } from '../../../../domain/types';
import type { Game } from '../types';
import type { GameState } from '../types';
import { type ResearchResult, countSymbols, describe, symbolsLacking, techOf, unresearchable } from '../../../../domain/replay/research';
import { gain } from './holdings';
/** The tokens the technologies of an entry give instead of being researched, for the card's free tokens. */
export const researchTokensGiven = (pack: DataPack, game: Pick<Game, 'faction'>, state: GameState, shared: GameState, ids: readonly string[] | undefined): number =>
  (ids ?? []).filter(id => componentById(pack, id)?.kind === 'technology')
    .reduce((sum, id) => sum + researchTokensOf(pack, game, state, shared, id), 0);

/** The tokens a research gives instead of the technology (Propagation); 0 when it is made as usual. */
export const researchTokensOf = (pack: DataPack, game: Pick<Game, 'faction'>, state: GameState, shared: GameState, technology: string): number =>
  applied(pack, holderOf(game, state, shared), 'researchTokens', 0, { technology }).value;

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
