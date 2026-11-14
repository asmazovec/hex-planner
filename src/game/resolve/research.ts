/**
 * Research (LRR 90): the one place a technology is researched, by the Technology card or by a component that says
 * "research". In the order of the technologies it checks that each is not owned (90.10), can be researched (90.9) and has
 * its prerequisites (90.12); a component changes the numbers through the points `prerequisites` and `researchTokens`, or
 * waives the warning. The specialties exhaust planets (90.14) and each ignores one symbol of its colour, once.
 * The pure counting of symbols is `domain/replay/research.ts`, imported.
 */
import { componentById, ownedBy } from '../../domain/components';
import '../../domain/effects/points/research';
import {
  countSymbols, symbolsLacking, techOf, unresearchable, type Symbols,
} from '../../domain/replay/research';
import prerequisitesMissing from '../../domain/rules/codes/prerequisitesMissing';
import researchForeign from '../../domain/rules/codes/researchForeign';
import researchUnavailable from '../../domain/rules/codes/researchUnavailable';
import { violation } from '../../domain/rules/registry';
import type { TechType } from '../../domain/types';
import { appliedOn } from '../abilities/registry';
import { cardsOf, ownerOf } from '../queries';
import { emit, warn, type Ctx } from './context';

const describe = (symbols: Symbols): string => Object.entries(symbols).filter(([, n]) => n).map(([colour, n]) => `${colour} ×${n}`).join(', ');

/** Researches the technologies in order; what each brings the next may rest on. Forbids nothing; returns the tokens given instead of research. */
export function researchTechnologies(ctx: Ctx, ids: readonly string[] | undefined, specialties: readonly string[] = []): number {
  const spare: TechType[] = [];
  for (const planetId of specialties) {
    const mine = ownerOf(ctx.board, planetId) === ctx.player;
    if (!mine) warn(ctx, violation('planetNotControlled', { planetId }, 'card'));
    else if (ctx.board.planets[planetId].exhausted) warn(ctx, violation('planetExhausted', { planetId }, 'card'));
    else spare.push(...(ctx.pack.planets[planetId]?.tech ?? []));
    if (mine && !ctx.board.planets[planetId].exhausted) emit(ctx, [{ type: 'PlanetExhausted', player: ctx.player, planet: planetId }], { quiet: true });
  }
  let tokens = 0;
  for (const id of ids ?? []) {
    const def = componentById(ctx.pack, id);
    if (def?.kind !== 'technology') continue;
    const name = def.name;
    const held = (): string[] => cardsOf(ctx.board, ctx.player, 'technology').map(c => c.id);
    if (held().includes(id)) {
      warn(ctx, violation('researchOwned', { id, name }));
      continue;
    }
    if (unresearchable(ctx.pack, id)) warn(ctx, violation(researchUnavailable.code, { id, name }));
    const faction = ctx.table.players.find(p => p.id === ctx.player)?.faction ?? '';
    if (def.faction !== undefined && !ownedBy(def, faction)) warn(ctx, violation(researchForeign.code, { id, name }));
    // Propagation: the research is not made and the tokens come instead; nothing else of it is asked.
    const given = appliedOn(ctx.table, ctx.board, ctx.pack, ctx.player, 'researchTokens', 0, { technology: id }).value;
    if (given > 0) { tokens += given; continue; }
    const lacking = symbolsLacking(ctx.pack, id, held());
    for (const colour of Object.keys(lacking) as TechType[]) {
      while ((lacking[colour] ?? 0) > 0 && spare.includes(colour)) {
        lacking[colour]! -= 1;
        spare.splice(spare.indexOf(colour), 1);
      }
    }
    const upgrade = techOf(ctx.pack, id)?.upgrade !== undefined;
    const missing = appliedOn(ctx.table, ctx.board, ctx.pack, ctx.player, 'prerequisites', countSymbols(lacking), { technology: id, upgrade, missing: { ...lacking } }).value;
    if (missing > 0) warn(ctx, violation(prerequisitesMissing.code, { id, name, missing, symbols: describe(lacking) }));
    emit(ctx, [{ type: 'TechnologyResearched', player: ctx.player, technology: id }], { quiet: true });
  }
  return tokens;
}
