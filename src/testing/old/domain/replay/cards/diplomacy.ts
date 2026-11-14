import type { CardEntry } from '../../../../../domain/strategy';
import type { DataPack, Game, GameState, PlanetDef } from '../../../../../domain/types';
import { systemPlanets } from '../../../../../domain/replay/board';
import { inSystem } from '../../../../../domain/replay/cards/diplomacy';
/** The planets the entry may ready: my exhausted ones, or for the base primary mine in the chosen system; those already chosen stay listed. */
export function readyChoices(game: Game, entry: CardEntry, before: GameState, pack: DataPack): PlanetDef[] {
  const mine = (id: string) => before.control[id] === 'me';
  const systemId = entry.effects?.systemId;
  if (inSystem(entry, game.expansions)) return systemId ? systemPlanets(game, systemId, pack).filter(p => mine(p.id)) : [];
  const readied = entry.effects?.readied ?? [];
  return [...new Set([...before.exhausted.filter(mine), ...readied])].flatMap(id => pack.planets[id] ?? []);
}
