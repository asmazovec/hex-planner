/**
 * Shelf in the replay: what an entry brings or takes (`gains`, `spends`), the component a component action names,
 * the objectives a status entry scores, and the Ready Cards step. A component id the pack does not know (an expansion
 * switched off, data rebuilt) is passed over everywhere, silently.
 */
import { componentById, componentsOf, noteAddress, ownedBy } from '../components';
import { HOLDING_FIELD, staysInPlay } from '../holdings';
import type { ComponentDef, DataPack, GameState } from '../types';
import type { Shelf } from '../shelf';

export const removeOne = (list: string[], id: string): void => {
  const at = list.indexOf(id);
  if (at >= 0) list.splice(at, 1);
};

/** How an entry's agenda was resolved: its outcome, the faction of the player elected, the planet elected. */
export interface GainHow { outcome?: string; elected?: string; planet?: string }

export const known = (pack: DataPack, ids: string[] | undefined): ComponentDef[] =>
  (ids ?? []).flatMap(id => componentById(pack, id) ?? []);

/**
 * Whether a player holds a component to play it. Abilities, mechs and legendary planets come with the faction sheet or
 * a planet and are not held as cards, so they always pass; a purged leader is held no more.
 */
export function holds(holdings: Shelf, def: ComponentDef): boolean {
  // An exploration card that does not stay in the play area is held by no one: what it does is played where it was explored.
  if (def.kind === 'exploration' && !staysInPlay(def)) return true;
  const field = HOLDING_FIELD[def.kind];
  if (field) return holdings[field].includes(def.id);
  if (def.kind === 'leader') return holdings.leaders[def.id] !== undefined && holdings.leaders[def.id] !== 'purged';
  if (def.kind === 'breakthrough') return holdings.breakthrough !== undefined;
  return true;
}

/** Whether a component a player holds is exhausted: it does nothing until the status phase readies it (34, 71.4). */
export function isExhausted(holdings: Shelf, def: ComponentDef): boolean {
  if (def.kind === 'leader') return holdings.leaders[def.id] === 'exhausted';
  if (def.kind === 'breakthrough') return holdings.breakthrough === 'exhausted';
  return holdings.exhausted.includes(def.id);
}

/**
 * The components a player of a faction holds ready to play: held and not exhausted. What comes with a faction sheet
 * counts for that faction only, and the card of a legendary planet for the player who controls the planet (`control`
 * is that player's own, by planet id).
 */
export function readyToPlay(pack: DataPack, holdings: Shelf, factionId: string, control: GameState['control'] = {}): Set<string> {
  const mine = (def: ComponentDef) => (def.kind === 'legendary'
    ? control[def.id.slice(def.id.indexOf(':') + 1)] === 'me'
    : HOLDING_FIELD[def.kind] !== undefined || def.faction === undefined || ownedBy(def, factionId));
  // The notes held are cards of their own, each under its address: the catalogue does not list them.
  const notes = holdings.promissory.flatMap(id => (noteAddress(id) === undefined ? [] : componentById(pack, id) ?? []));
  return new Set([...componentsOf(pack), ...notes].filter(def => mine(def) && holds(holdings, def) && !isExhausted(holdings, def)).map(def => def.id));
}

export const EXHAUSTS = /\bexhaust this (card|agent)\b/i;
export const PURGES = /\bpurge this card\b/i;
/** A note that goes back once its ability is resolved says so last: "Then, return this card to the ... player." */
export const RETURNS = /\bthen,? return this card to\b/i;
