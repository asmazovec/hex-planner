/**
 * The systems a card's effect can be aimed at on the map, which the map lights while the card picks one: Warfare takes
 * back a token from a system that has one; Diplomacy is never aimed at Mecatol Rex (LRR 32); Construction places on a
 * planet of mine (LRR 24), and its secondary before Thunder's Edge goes where no token of mine lies; a dock needs one.
 * Nothing here forbids a tap elsewhere.
 */
import { MECATOL_PLANETS } from '../../mecatol';
import type { Entry, Game, GameState, DataPack } from '../../types';
import { isOnMap, systemPlanets, systemSlots } from '../board';
import { CARD } from './ids';

type CardEntry = Extract<Entry, { type: 'strategic' | 'secondary' }>;

/** What a tap on the map chooses for a card: the system of its effect, a place to build, or a dock to produce at. */
export type CardMapPick = 'system' | 'build' | 'dock';

/**
 * `before` is the state just before the card, `latest` the state the map shows (the planets mine and the docks there).
 */
export function cardTargets(game: Game, pack: DataPack, entry: CardEntry, pick: CardMapPick, before: GameState, latest: GameState): string[] {
  const primary = (card: number) => entry.type === 'strategic' && entry.card === card;
  if (primary(CARD.warfare)) return before.tokensOnMap.filter(slot => isOnMap(game, slot));
  const fits = (planetId: string) => (pick === 'dock' ? latest.docks.includes(planetId) : latest.control[planetId] === 'me');
  const excluded = primary(CARD.diplomacy) ? MECATOL_PLANETS : [];
  // Construction's secondary leaves its token there before Thunder's Edge: any system can be tapped, those without one are lit.
  const placesToken = entry.type === 'secondary' && entry.card === CARD.construction && !game.expansions.includes('te');
  const tokened = placesToken ? before.tokensOnMap : [];
  return systemSlots(game).filter(slot => {
    const planets = systemPlanets(game, slot, pack);
    return planets.some(p => fits(p.id)) && !planets.some(p => excluded.includes(p.id)) && !tokened.includes(slot);
  });
}
