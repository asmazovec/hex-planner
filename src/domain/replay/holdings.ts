/**
 * Holdings in the replay: what an entry brings or takes (`gains`, `spends`), the component a component action names,
 * the objectives a status entry scores, and the Ready Cards step. A component id the pack does not know (an expansion
 * switched off, data rebuilt) is passed over everywhere, silently.
 */
import { componentById } from '../components';
import { HOLDING_FIELD, holdingsOf } from '../holdings';
import { violation } from '../rules/registry';
import type { ComponentDef, DataPack, Entry, GameState, Holdings, StartHoldings, Warning } from '../types';

/** The holdings a game begins with, less what the pack does not know. */
export function startHoldings(start: StartHoldings | undefined, pack: DataPack): Holdings {
  const holdings = holdingsOf(start);
  const known = (id: string) => componentById(pack, id) !== undefined;
  for (const field of ['technologies', 'hand', 'relics', 'promissory', 'scored', 'secrets'] as const) holdings[field] = holdings[field].filter(known);
  holdings.leaders = Object.fromEntries(Object.entries(holdings.leaders).filter(([id]) => known(id)));
  return holdings;
}

const removeOne = (list: string[], id: string): void => {
  const at = list.indexOf(id);
  if (at >= 0) list.splice(at, 1);
};

/**
 * A player gains a component: its kind decides where it lies. An action card joins the hand as one more copy, the rest
 * is held once. An agenda becomes a law of the whole game (`shared` is my state). An exploration card is not held:
 * an attachment needs its planet, which gains do not name.
 */
export function gain(own: GameState, shared: GameState, def: ComponentDef): void {
  const holdings = own.holdings;
  const field = HOLDING_FIELD[def.kind];
  if (field) {
    if (field === 'hand' || !holdings[field].includes(def.id)) holdings[field].push(def.id);
  } else if (def.kind === 'leader') holdings.leaders[def.id] = 'unlocked';
  else if (def.kind === 'breakthrough') holdings.breakthrough = 'held';
  else if (def.kind === 'agenda') {
    const laws = (shared.laws ??= []);
    if (!laws.includes(def.id)) laws.push(def.id);
  }
}

/** A player loses a component: one copy leaves its place; a leader is purged, a law repealed. What is not there changes nothing. */
export function lose(own: GameState, shared: GameState, def: ComponentDef): void {
  const holdings = own.holdings;
  const field = HOLDING_FIELD[def.kind];
  if (field) removeOne(holdings[field], def.id);
  else if (def.kind === 'leader') {
    if (holdings.leaders[def.id]) holdings.leaders[def.id] = 'purged';
  } else if (def.kind === 'breakthrough') delete holdings.breakthrough;
  else if (def.kind === 'agenda') removeOne((shared.laws ??= []), def.id);
  if (field && !holdings[field].includes(def.id)) removeOne(holdings.exhausted, def.id);
}

const known = (pack: DataPack, ids: string[] | undefined): ComponentDef[] =>
  (ids ?? []).flatMap(id => componentById(pack, id) ?? []);

/** The `gains` and `spends` of any entry, for its owner. */
export function applyGains(own: GameState, shared: GameState, entry: Entry, pack: DataPack): void {
  for (const def of known(pack, entry.gains)) gain(own, shared, def);
  for (const def of known(pack, entry.spends)) lose(own, shared, def);
}

/** The technologies an entry researches, into the owner's holdings. */
export function research(own: GameState, ids: string[] | undefined, pack: DataPack): void {
  for (const def of known(pack, ids)) if (def.kind === 'technology') gain(own, own, def);
}

/**
 * Whether a player holds a component to play it. Abilities, mechs and legendary planets come with the faction sheet or
 * a planet and are not held as cards, so they always pass; a purged leader is held no more.
 */
export function holds(holdings: Holdings, def: ComponentDef): boolean {
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

const EXHAUSTS = /\bexhaust this card\b/i;
const PURGES = /\bpurge this card\b/i;

/**
 * A component action names its component (22.1). One not held, or exhausted (71.4), is warned about and still played.
 * Playing it: an action card is discarded (2.7); an agent is exhausted (51.4) and a hero purged (51.12); a card whose
 * printed text exhausts it is exhausted (34.4), and a relic whose text purges it is gone (70).
 */
export function applyComponent(own: GameState, entry: Extract<Entry, { type: 'component' }>, pack: DataPack, warnings: Warning[]): void {
  const def = entry.componentId === undefined ? undefined : componentById(pack, entry.componentId);
  if (!def) return;
  const holdings = own.holdings;
  const params = { id: def.id, name: def.name };
  if (!holds(holdings, def)) warnings.push(violation('componentNotHeld', params));
  else if (isExhausted(holdings, def)) warnings.push(violation('componentExhausted', params));
  switch (def.kind) {
    case 'actionCard':
      removeOne(holdings.hand, def.id);
      break;
    case 'leader':
      if (def.detail?.type === 'agent') holdings.leaders[def.id] = 'exhausted';
      else if (def.detail?.type === 'hero') holdings.leaders[def.id] = 'purged';
      break;
    case 'breakthrough':
      if (EXHAUSTS.test(def.text)) holdings.breakthrough = 'exhausted';
      break;
    case 'relic':
    case 'technology':
    case 'legendary':
      if (def.kind === 'relic' && PURGES.test(def.text)) {
        removeOne(holdings.relics, def.id);
        removeOne(holdings.exhausted, def.id);
      } else if (EXHAUSTS.test(def.text) && !holdings.exhausted.includes(def.id)) holdings.exhausted.push(def.id);
      break;
  }
}

/**
 * The objectives a status entry scores (81.1): a secret one leaves the hand for the scored ones, a public one joins
 * them and is revealed for the whole game if it was not.
 */
export function applyScored(own: GameState, shared: GameState, ids: string[] | undefined, pack: DataPack): void {
  for (const def of known(pack, ids)) {
    if (def.kind !== 'secretObjective' && def.kind !== 'publicObjective') continue;
    if (def.kind === 'secretObjective') removeOne(own.holdings.secrets, def.id);
    else if (!(shared.revealed ??= []).includes(def.id)) shared.revealed.push(def.id);
    if (!own.holdings.scored.includes(def.id)) own.holdings.scored.push(def.id);
  }
}

/** The Ready Cards step (81.6, 34.2), for every player at once: exhausted components, agents and breakthroughs are readied. */
export function readyCards(states: GameState[]): void {
  for (const { holdings } of states) {
    holdings.exhausted = [];
    for (const id of Object.keys(holdings.leaders)) if (holdings.leaders[id] === 'exhausted') holdings.leaders[id] = 'unlocked';
    if (holdings.breakthrough === 'exhausted') holdings.breakthrough = 'held';
  }
}
