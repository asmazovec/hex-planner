import { HOLDING_FIELD, staysInPlay, holdingsOf } from '../../../../domain/holdings';
import type { ComponentDef, StartHoldings, DataPack, Entry, Warning } from '../../../../domain/types';
import type { GameState, Holdings } from '../types';
import { type GainHow, known, removeOne, holds, isExhausted, PURGES, RETURNS, EXHAUSTS } from '../../../../domain/replay/holdings';
import { componentById, noteAddress } from '../../../../domain/components';
import { breakthroughOf } from '../../../../domain/effects/breakthrough';
import { violation } from '../../../../domain/rules/registry';
/** The holdings a game begins with, less what the pack does not know. */
export function startHoldings(start: StartHoldings | undefined, pack: DataPack): Holdings {
  const holdings = holdingsOf(start);
  const known = (id: string) => componentById(pack, id) !== undefined;
  for (const field of ['technologies', 'hand', 'relics', 'promissory', 'scored', 'secrets', 'found'] as const) holdings[field] = holdings[field].filter(known);
  holdings.leaders = Object.fromEntries(Object.entries(holdings.leaders).filter(([id]) => known(id)));
  return holdings;
}
/** A player loses a component: one copy leaves its place; a leader is purged, a law repealed. What is not there changes nothing. */
export function lose(own: GameState, shared: GameState, def: ComponentDef): void {
  const holdings = own.holdings;
  const field = HOLDING_FIELD[def.kind];
  if (field) removeOne(holdings[field], def.id);
  else if (def.kind === 'leader') {
    if (holdings.leaders[def.id]) holdings.leaders[def.id] = 'purged';
  } else if (def.kind === 'breakthrough') delete holdings.breakthrough;
  else if (def.kind === 'agenda') {
    removeOne((shared.laws ??= []), def.id);
    if (shared.lawOwners) delete shared.lawOwners[def.id];
    for (const planetId of Object.keys(shared.attachments ?? {})) removeOne(shared.attachments![planetId], def.id);
  }
  if (field && !holdings[field].includes(def.id)) removeOne(holdings.exhausted, def.id);
}
/**
 * The `gains` and `spends` of any entry, for its owner. An agenda gained by an entry of the agenda phase is resolved by
 * its `choices` (`outcome`, `elect`); `factionOf` tells the faction of a player id (`me` or an opponent), the entry's owner being elected without one.
 */
export function applyGains(own: GameState, shared: GameState, entry: Entry, pack: DataPack, factionOf: (player: string) => string | undefined = () => undefined): void {
  const choices = entry.type === 'adjustment' ? entry.choices ?? {} : {};
  const elect = choices.elect === undefined ? undefined : String(choices.elect);
  const how: GainHow = {
    outcome: choices.outcome === undefined ? undefined : String(choices.outcome),
    elected: factionOf(elect === undefined || elect in pack.planets ? entry.owner ?? 'me' : elect) ?? undefined,
    planet: elect !== undefined && elect in pack.planets ? elect : undefined,
  };
  // A breakthrough is the player's own: one of another faction's is not held by gaining it.
  const mine = factionOf(entry.owner ?? 'me');
  const theirs = (def: ComponentDef) => def.kind === 'breakthrough' && mine !== undefined && def.id !== breakthroughOf(pack, mine);
  for (const def of known(pack, entry.gains)) if (!theirs(def)) gain(own, shared, def, how);
  for (const def of known(pack, entry.spends)) lose(own, shared, def);
}
/** The technologies an entry researches, into the owner's holdings. */
export function research(own: GameState, ids: string[] | undefined, pack: DataPack): void {
  for (const def of known(pack, ids)) if (def.kind === 'technology') gain(own, own, def);
}
/** One component played by `player` (`me` or an opponent id), as the rules of its kind have it. */
export function playComponent(
  own: GameState, id: string, player: string, pack: DataPack, warnings: Warning[], faction = '', states: Record<string, GameState> = {},
): void {
  const def = componentById(pack, id);
  if (!def) return;
  const holdings = own.holdings;
  // The rules are read from the text as printed (English), never from its translation: the language must not change the replay.
  const printed = pack.originalTexts?.[def.id] ?? def.text;
  const params = { id: def.id, name: def.name };
  const held = holds(holdings, def);
  if (!held) warnings.push(violation('componentNotHeld', params));
  else if (isExhausted(holdings, def)) warnings.push(violation('componentExhausted', params));
  switch (def.kind) {
    case 'promissory': {
      const owner = noteAddress(def.id);
      // A note marked by hand has no address: only its faction tells whose it is.
      if (owner === undefined ? def.faction !== undefined && def.faction === faction : owner === player) {
        warnings.push(violation('ownPromissory', params));
        break;
      }
      if (!held) break;
      const back = owner === undefined ? undefined : states[owner]?.holdings;
      if (PURGES.test(printed) || (back && RETURNS.test(printed))) removeOne(holdings.promissory, def.id);
      if (back && RETURNS.test(printed) && !back.promissory.includes(def.id)) back.promissory.push(def.id);
      break;
    }
    case 'actionCard':
      removeOne(holdings.hand, def.id);
      break;
    case 'exploration':
      // "Purge this card" (Enigmatic Device); a relic fragment is purged with its relic's other fragments, in `spends`.
      if (PURGES.test(printed)) removeOne(holdings.found, def.id);
      break;
    case 'leader':
      if (def.detail?.type === 'agent') holdings.leaders[def.id] = 'exhausted';
      else if (def.detail?.type === 'hero') holdings.leaders[def.id] = 'purged';
      break;
    case 'breakthrough':
      if (EXHAUSTS.test(printed)) holdings.breakthrough = 'exhausted';
      break;
    case 'relic':
    case 'technology':
    case 'legendary':
      if (def.kind === 'relic' && PURGES.test(printed) && !EXHAUSTS.test(printed)) {
        removeOne(holdings.relics, def.id);
        removeOne(holdings.exhausted, def.id);
      } else if (EXHAUSTS.test(printed) && !holdings.exhausted.includes(def.id)) holdings.exhausted.push(def.id);
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
