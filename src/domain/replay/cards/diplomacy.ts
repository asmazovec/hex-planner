/**
 * Diplomacy (LRR 32): the primary picks a system with a planet of mine, other than Mecatol Rex, where every other player
 * puts a token from reinforcements; both sides ready up to two of my exhausted planets, the base primary every one of
 * mine in that system.
 */
import { strategyCardSet } from '../../cards';
import { MECATOL_PLANETS } from '../../mecatol';
import { violation } from '../../rules/registry';
import type { CardEntry } from '../../strategy';
import type { DataPack, ExpansionId, Game, GameState, PlanetDef } from '../../types';
import { systemPlanets } from '../board';
import type { CardHandler } from './handler';

const READY_LIMIT = 2;

/** Whether the planets to ready are those of the chosen system, with no limit: only the base primary says "that system". */
const inSystem = (entry: CardEntry, expansions: ExpansionId[]): boolean =>
  entry.type === 'strategic' && strategyCardSet(expansions) === 'base_game';

/** How many planets the entry may ready, or null for no limit. */
export const readyLimit = (entry: CardEntry, expansions: ExpansionId[]): number | null =>
  (inSystem(entry, expansions) ? null : READY_LIMIT);

/** The planets the entry may ready: my exhausted ones, or for the base primary mine in the chosen system; those already chosen stay listed. */
export function readyChoices(game: Game, entry: CardEntry, before: GameState, pack: DataPack): PlanetDef[] {
  const mine = (id: string) => before.control[id] === 'me';
  const systemId = entry.effects?.systemId;
  if (inSystem(entry, game.expansions)) return systemId ? systemPlanets(game, systemId, pack).filter(p => mine(p.id)) : [];
  const readied = entry.effects?.readied ?? [];
  return [...new Set([...before.exhausted.filter(mine), ...readied])].flatMap(id => pack.planets[id] ?? []);
}

/** Whether the system may be chosen: it holds a planet I control and is not the Mecatol Rex system. */
export function diplomacySystemAllowed(game: Game, state: GameState, systemId: string, pack: DataPack): boolean {
  const planets = systemPlanets(game, systemId, pack);
  return !planets.some(p => MECATOL_PLANETS.includes(p.id)) && planets.some(p => state.control[p.id] === 'me');
}

export const diplomacy: CardHandler = {
  apply: ({ game, state, entry, pack, round, player, primary, warnings }) => {
    const effects = entry.effects ?? {};
    const limit = readyLimit(entry, game.expansions);
    const readied = effects.readied?.length ?? 0;
    if (limit !== null && readied > limit) warnings.push(violation('readyOverLimit', { limit, readied }));
    const systemId = effects.systemId;
    if (!primary || !systemId) return;
    if (!diplomacySystemAllowed(game, state, systemId, pack)) warnings.push(violation('diplomacySystem', { systemId }));
    // The other players' tokens come from reinforcements, not their pools; one who already has a token there places none.
    for (const [id, other] of Object.entries(round.states)) {
      if (id !== player && !other.tokensOnMap.includes(systemId)) other.tokensOnMap.push(systemId);
    }
  },
};
