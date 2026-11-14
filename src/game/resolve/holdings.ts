/**
 * What a player holds, as a turn changes it: a component played (2.7, 34.4, 51.4, 51.12, 69.2, 69.3, 70), the components
 * a turn gains and spends, the objectives a status entry scores (81.1). A component the pack does not know is passed over.
 * The text of a card is read as printed (English), so the language never changes the result. Each change is an event on
 * the player's cards; what is held is read from the board.
 */
import { componentById, noteAddress } from '../../domain/components';
import { breakthroughOf } from '../../domain/effects/breakthrough';
import { HOLDING_FIELD, staysInPlay } from '../../domain/holdings';
import { EXHAUSTS, holds, isExhausted, PURGES, RETURNS } from '../../domain/replay/holdings';
import { violation } from '../../domain/rules/registry';
import type { ComponentDef } from '../../domain/types';
import type { TurnFacts } from '../turnFacts';
import type { GameEvent } from '../events';
import { holdingsOfCards, legacyKey, playerOfKey } from '../keys';
import type { PlayerId } from '../types';
import { emit, warn, type Ctx } from './context';

const holdOf = (ctx: Ctx, player: PlayerId, id: string) => ctx.board.players[player]?.cards[id];
const holdingsOf = (ctx: Ctx, player: PlayerId) => holdingsOfCards(ctx.board.players[player]?.cards ?? {});
const lost = (player: PlayerId, card: string): GameEvent => ({ type: 'CardLost', player, card });
const gained = (player: PlayerId, card: string, state?: 'exhausted' | 'purged'): GameEvent =>
  ({ type: 'CardGained', player, card, ...(state ? { state } : {}) });

/** The state a card passes to without being there first: it is made, in that state. */
const toState = (ctx: Ctx, player: PlayerId, id: string, state: 'exhausted' | 'purged'): GameEvent => {
  if (!holdOf(ctx, player, id)) return gained(player, id, state);
  return { type: state === 'exhausted' ? 'CardExhausted' : 'CardPurged', player, card: id };
};

/** One component played by `player`, as the rules of its kind have it. */
export function playComponent(ctx: Ctx, id: string, player: PlayerId): void {
  const def = componentById(ctx.pack, id);
  if (!def) return;
  const holdings = holdingsOf(ctx, player);
  const printed = ctx.pack.originalTexts?.[def.id] ?? def.text;
  const params = { id: def.id, name: def.name };
  const held = holds(holdings, def);
  if (!held) warn(ctx, violation('componentNotHeld', params));
  else if (isExhausted(holdings, def)) warn(ctx, violation('componentExhausted', params));
  const events: GameEvent[] = [];
  const faction = ctx.table.players.find(p => p.id === player)?.faction ?? '';
  switch (def.kind) {
    case 'promissory': {
      const owner = noteAddress(def.id);
      // A note marked by hand has no address: only its faction tells whose it is.
      if (owner === undefined ? def.faction !== undefined && def.faction === faction : owner === legacyKey(ctx.table, player)) {
        warn(ctx, violation('ownPromissory', params));
        break;
      }
      if (!held) break;
      const back = owner === undefined ? undefined : playerOfKey(ctx.table, owner);
      const returns = back !== undefined && RETURNS.test(printed);
      if (PURGES.test(printed) || returns) events.push(lost(player, def.id));
      if (returns && !holdOf(ctx, back, def.id)) events.push(gained(back, def.id));
      break;
    }
    case 'actionCard':
      if (holdOf(ctx, player, def.id)) events.push(lost(player, def.id));
      break;
    case 'exploration':
      // "Purge this card" (Enigmatic Device); a relic fragment is purged with its relic's other fragments, in `spends`.
      if (PURGES.test(printed) && holdOf(ctx, player, def.id)) events.push(lost(player, def.id));
      break;
    case 'leader':
      if (def.detail?.type === 'agent') events.push(toState(ctx, player, def.id, 'exhausted'));
      else if (def.detail?.type === 'hero') events.push(toState(ctx, player, def.id, 'purged'));
      break;
    case 'breakthrough':
      if (EXHAUSTS.test(printed)) events.push(toState(ctx, player, def.id, 'exhausted'));
      break;
    case 'relic':
    case 'technology':
    case 'legendary':
      if (def.kind === 'relic' && PURGES.test(printed) && !EXHAUSTS.test(printed)) {
        if (holdOf(ctx, player, def.id)) events.push(lost(player, def.id));
      } else if (EXHAUSTS.test(printed) && !holdings.exhausted.includes(def.id)) {
        // A technology that is not held cannot be exhausted on a board: the warning stays, the card does not appear.
        if (holdOf(ctx, player, def.id)) events.push(toState(ctx, player, def.id, 'exhausted'));
        else if (def.kind !== 'technology') events.push(toState(ctx, player, def.id, 'exhausted'));
      }
      break;
  }
  emit(ctx, events, { quiet: true });
}

/** The components an entry uses beside its action: each is played as a component action plays its own, the action's own once. */
export function playUses(ctx: Ctx): void {
  const entry = ctx.entry;
  const action = entry.type === 'component' ? entry.componentId : undefined;
  for (const id of new Set(entry.uses)) if (id !== action) playComponent(ctx, id, ctx.player);
}

const known = (ctx: Ctx, ids: string[] | undefined): ComponentDef[] => (ids ?? []).flatMap(id => componentById(ctx.pack, id) ?? []);

/** How an entry's agenda was resolved, and who it elected. */
function howOf(ctx: Ctx, entry: TurnFacts): { outcome?: string; elected?: PlayerId; planet?: string } {
  const choices = entry.type === 'adjustment' ? entry.choices ?? {} : {};
  const elect = choices.elect === undefined ? undefined : String(choices.elect);
  const byFaction = (key: string): PlayerId | undefined => {
    const player = playerOfKey(ctx.table, key);
    return player === undefined || !ctx.table.players.find(p => p.id === player)?.faction ? undefined : player;
  };
  const electedKey = elect === undefined || elect in ctx.pack.planets ? entry.owner ?? 'me' : elect;
  return {
    outcome: choices.outcome === undefined ? undefined : String(choices.outcome),
    elected: byFaction(electedKey),
    planet: elect !== undefined && elect in ctx.pack.planets ? elect : undefined,
  };
}

/** A player gains a component, by its kind (`player` is the owner of the entry unless a transaction hands it over). */
export function gain(ctx: Ctx, def: ComponentDef, how: ReturnType<typeof howOf>, player: PlayerId = ctx.player): void {
  const field = HOLDING_FIELD[def.kind];
  const events: GameEvent[] = [];
  const have = holdOf(ctx, player, def.id);
  if (def.kind === 'exploration') {
    if (staysInPlay(def)) events.push(gained(player, def.id));
  } else if (field) {
    if (field === 'hand' || !have) events.push(gained(player, def.id));
  } else if (def.kind === 'leader') {
    if (!have) events.push(gained(player, def.id));
    else if (have.state === 'locked') events.push({ type: 'CardUnlocked', player, card: def.id });
  } else if (def.kind === 'breakthrough') {
    if (!have) events.push(gained(player, def.id));
  } else if (def.kind === 'agenda' && def.detail?.type !== 'directive') {
    // A law resolved "against" is not in play (7.6).
    if (how.outcome === 'against') return;
    if (!ctx.board.common.laws.some(l => l.id === def.id)) {
      const target = String(def.detail?.target ?? '');
      // An "Elect Player" law binds the player elected; "Elect Planet" attaches it to the planet elected (7.3.1).
      const elected = target.startsWith('Elect Player') ? how.elected : undefined;
      events.push({ type: 'LawEnacted', law: def.id, ...(elected === undefined ? {} : { elected }) });
    }
    if (targetOf(def).startsWith('Elect Planet') && how.planet !== undefined && !ctx.board.planets[how.planet]?.attached.includes(def.id)) {
      events.push({ type: 'CardAttached', planet: how.planet, card: def.id });
    }
  }
  emit(ctx, events, { quiet: true });
}

const targetOf = (def: ComponentDef): string => String(def.detail?.target ?? '');

/** A player loses a component: one copy leaves, a leader is purged, a law repealed. */
export function lose(ctx: Ctx, def: ComponentDef, player: PlayerId = ctx.player): void {
  const have = holdOf(ctx, player, def.id);
  const events: GameEvent[] = [];
  if (HOLDING_FIELD[def.kind]) {
    if (have) events.push(lost(player, def.id));
  } else if (def.kind === 'leader') {
    if (have && have.state !== 'purged') events.push({ type: 'CardPurged', player, card: def.id });
  } else if (def.kind === 'breakthrough') {
    if (have) events.push(lost(player, def.id));
  } else if (def.kind === 'agenda' && ctx.board.common.laws.some(l => l.id === def.id)) events.push({ type: 'LawDiscarded', law: def.id });
  emit(ctx, events, { quiet: true });
}

/** The `gains` and `spends` of any entry, for its owner. A breakthrough is the player's own: one of another faction's is not held by gaining it. */
export function applyGains(ctx: Ctx): void {
  const entry = ctx.entry;
  const how = howOf(ctx, entry);
  const faction = ctx.table.players.find(p => p.id === ctx.player)?.faction;
  const theirs = (def: ComponentDef): boolean => def.kind === 'breakthrough' && faction !== undefined && def.id !== breakthroughOf(ctx.pack, faction);
  for (const def of known(ctx, entry.gains)) if (!theirs(def)) gain(ctx, def, how);
  for (const def of known(ctx, entry.spends)) lose(ctx, def);
}

/** The objectives a status entry scores (81.1): a secret one leaves the hand for the scored ones, a public one joins them and is revealed for the whole game if it was not. */
export function applyScored(ctx: Ctx, ids: string[] | undefined): void {
  for (const def of known(ctx, ids)) {
    if (def.kind !== 'secretObjective' && def.kind !== 'publicObjective') continue;
    const events: GameEvent[] = [];
    if (def.kind === 'publicObjective' && !ctx.board.common.revealed.includes(def.id)) events.push({ type: 'ObjectiveRevealed', objective: def.id });
    if (holdOf(ctx, ctx.player, def.id)?.state !== 'inPlay') events.push({ type: 'ObjectiveScored', player: ctx.player, objective: def.id });
    emit(ctx, events, { quiet: true });
  }
}
