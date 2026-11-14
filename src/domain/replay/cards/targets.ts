/**
 * The systems a card's effect can be aimed at on the map, which the map lights while the card picks one: Warfare takes
 * back a token from a system that has one; Diplomacy is never aimed at Mecatol Rex (LRR 32); Construction places on a
 * planet of mine (LRR 24), and its secondary before Thunder's Edge goes where no token of mine lies; a dock needs one.
 * Nothing here forbids a tap elsewhere.
 */
import { MECATOL_PLANETS } from '../../mecatol';
import type { Entry, DataPack } from '../../types';
import { isOnMap, systemPlanets, systemSlots, type MapSource } from '../board';
import { CARD } from './ids';

export type CardEntry = Extract<Entry, { type: 'strategic' | 'secondary' }>;

/** What a tap on the map chooses for a card: the system of its effect, a place to build, or a dock to produce at. */
export type CardMapPick = 'system' | 'build' | 'dock';

/** What the targets are read from: the map, the systems holding a token of the player before the card, and whether a planet fits. */
export interface TargetReads { map: MapSource; expansions: readonly string[]; tokens: readonly string[]; fits: (planetId: string, pick: CardMapPick) => boolean }

/** The targets of a card over what the reads say; the old state and the board both ask this one. */
export function cardTargetsOver(reads: TargetReads, pack: DataPack, entry: CardEntry, pick: CardMapPick): string[] {
  const { map, tokens } = reads;
  const primary = (card: number) => entry.type === 'strategic' && entry.card === card;
  if (primary(CARD.warfare)) return tokens.filter(slot => isOnMap(map, slot));
  const excluded = primary(CARD.diplomacy) ? MECATOL_PLANETS : [];
  // Construction's secondary leaves its token there before Thunder's Edge: any system can be tapped, those without one are lit.
  const placesToken = entry.type === 'secondary' && entry.card === CARD.construction && !reads.expansions.includes('te');
  const tokened = placesToken ? tokens : [];
  return systemSlots(map).filter(slot => {
    const planets = systemPlanets(map, slot, pack);
    return planets.some(p => reads.fits(p.id, pick)) && !planets.some(p => excluded.includes(p.id)) && !tokened.includes(slot);
  });
}
