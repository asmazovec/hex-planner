/**
 * Holdings in the replay: what an entry brings or takes (`gains`, `spends`), the component a component action names,
 * the objectives a status entry scores, and the Ready Cards step. A component id the pack does not know (an expansion
 * switched off, data rebuilt) is passed over everywhere, silently.
 */
import { componentById, componentsOf, noteAddress, ownedBy } from '../components';
import { HOLDING_FIELD, staysInPlay } from '../holdings';
import type { ComponentDef, DataPack, GameState, Holdings } from '../types';

export const removeOne = (list: string[], id: string): void => {
  const at = list.indexOf(id);
  if (at >= 0) list.splice(at, 1);
};

/**
 * A player gains a component: its kind decides where it lies. An action card joins the hand as one more copy, the rest
 * is held once. An agenda that is a law becomes a law of the whole game (`shared` is my state, 7.3); a directive is
 * resolved and discarded (7.8), so it leaves nothing. An exploration card is held only when it stays in the play area
 * (a relic fragment, 35.9, with as many copies as were found); the others attach to a planet, which the `gained` hook
 * of the card knows, or are resolved at once.
 */
export function gain(own: GameState, shared: GameState, def: ComponentDef, how: GainHow = {}): void {
  const holdings = own.holdings;
  const field = HOLDING_FIELD[def.kind];
  if (def.kind === 'exploration') {
    if (staysInPlay(def)) holdings.found.push(def.id);
  } else if (field) {
    if (field === 'hand' || !holdings[field].includes(def.id)) holdings[field].push(def.id);
  } else if (def.kind === 'leader') holdings.leaders[def.id] = 'unlocked';
  else if (def.kind === 'breakthrough') holdings.breakthrough = 'held';
  else if (def.kind === 'agenda' && def.detail?.type !== 'directive') {
    // A law resolved "against" is not in play (7.6).
    if (how.outcome === 'against') return;
    const laws = (shared.laws ??= []);
    if (!laws.includes(def.id)) laws.push(def.id);
    const target = String(def.detail?.target ?? '');
    // An "Elect Player" law binds the player elected; "Elect Planet" attaches it to the planet elected (7.3.1).
    if (target.startsWith('Elect Player') && how.elected !== undefined) (shared.lawOwners ??= {})[def.id] = how.elected;
    if (target.startsWith('Elect Planet') && how.planet !== undefined) {
      const attached = ((shared.attachments ??= {})[how.planet] ??= []);
      if (!attached.includes(def.id)) attached.push(def.id);
    }
  }
}

/** How an entry's agenda was resolved: its outcome, the faction of the player elected, the planet elected. */
export interface GainHow { outcome?: string; elected?: string; planet?: string }

export const known = (pack: DataPack, ids: string[] | undefined): ComponentDef[] =>
  (ids ?? []).flatMap(id => componentById(pack, id) ?? []);

/**
 * Whether a player holds a component to play it. Abilities, mechs and legendary planets come with the faction sheet or
 * a planet and are not held as cards, so they always pass; a purged leader is held no more.
 */
export function holds(holdings: Holdings, def: ComponentDef): boolean {
  // An exploration card that does not stay in the play area is held by no one: what it does is played where it was explored.
  if (def.kind === 'exploration' && !staysInPlay(def)) return true;
  const field = HOLDING_FIELD[def.kind];
  if (field) return holdings[field].includes(def.id);
  if (def.kind === 'leader') return holdings.leaders[def.id] !== undefined && holdings.leaders[def.id] !== 'purged';
  if (def.kind === 'breakthrough') return holdings.breakthrough !== undefined;
  return true;
}

/** Whether a component a player holds is exhausted: it does nothing until the status phase readies it (34, 71.4). */
export function isExhausted(holdings: Holdings, def: ComponentDef): boolean {
  if (def.kind === 'leader') return holdings.leaders[def.id] === 'exhausted';
  if (def.kind === 'breakthrough') return holdings.breakthrough === 'exhausted';
  return holdings.exhausted.includes(def.id);
}

/**
 * The components a player of a faction holds ready to play: held and not exhausted. What comes with a faction sheet
 * counts for that faction only, and the card of a legendary planet for the player who controls the planet (`control`
 * is that player's own, by planet id).
 */
export function readyToPlay(pack: DataPack, holdings: Holdings, factionId: string, control: GameState['control'] = {}): Set<string> {
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
