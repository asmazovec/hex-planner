/**
 * The registry of abilities over the board: who holds what is in force, which reminders a step shows to whom, and what
 * a point of the count comes to. Everything asks the board and the table; none of it builds the old per-player state.
 * The effects themselves are collected from the component files by `src/domain/effects/registry.ts`; whose action an
 * ability speaks in is its `holder` declaration (`src/domain/effects/holder.ts`), read here and nowhere else.
 */
import { componentById, noteAddress } from '../../domain/components';
import { stacked, type Applied } from '../../domain/effects/apply';
import { speaksIn } from '../../domain/effects/holder';
import { effectOf, holderRuleOf, inForceOf, orderOf, passivesOf, readyComponents, type Holder } from '../../domain/effects/registry';
import type { ComponentEffect, ModifierContext, Modifiers } from '../../domain/effects/types';
import type { ComponentDef, Holdings, RuleStep } from '../../domain/types';
import { holdingsOfCards, legacyKey } from '../keys';
import type { Board, DataPack, PlayerId, Table } from '../types';


/** The holder a player is, read from the board: their cards and faction, the planets they control, the laws that bind them. */
export function holderIn(table: Table, board: Board, player: PlayerId): Holder {
  const cards = board.players[player]?.cards;
  const kept = cards && HOLDERS.get(cards);
  if (kept && kept.table === table && kept.planets === board.planets && kept.laws === board.common.laws && kept.player === player) return kept.holder;
  const faction = table.players.find(p => p.id === player)?.faction;
  const control: Record<string, 'me'> = {};
  for (const [id, planet] of Object.entries(board.planets)) if (planet.owner === player) control[id] = 'me';
  const laws = board.common.laws.filter(law => law.elected === undefined || law.elected === player).map(law => law.id);
  // An Alliance note lends its owner's commander: every player's holdings, under their id and under the key notes are addressed by.
  const others: Record<string, Holdings> = {};
  for (const p of table.players) others[legacyKey(table, p.id)] = others[p.id] = holdingsOf(board, p.id);
  const holder: Holder = { holdings: holdingsOf(board, player), ...(faction === undefined ? {} : { faction }), control, laws, others };
  if (cards) HOLDERS.set(cards, { table, planets: board.planets, laws: board.common.laws, player, holder });
  return holder;
}
/** A holder is a function of the board's immutable parts, so it is kept while they are the same objects. */
const HOLDERS = new WeakMap<object, { table: Table; planets: Board['planets']; laws: Board['common']['laws']; player: PlayerId; holder: Holder }>();
const PASSIVES = new WeakMap<Holder, { pack: DataPack; list: ReturnType<typeof passivesOf> }>();
const FORCED = new WeakMap<Holder, { pack: DataPack; found: string[] }>();

/** The components in force for a player without being played, in registry order. */
export function inForce(table: Table, board: Board, pack: DataPack, player: PlayerId): string[] {
  const holder = holderIn(table, board, player);
  let kept = FORCED.get(holder);
  if (!kept || kept.pack !== pack) FORCED.set(holder, kept = { pack, found: inForceOf(pack, holder) });
  return kept.found;
}

/** A point of the count for a player: the base, changed by each component of theirs in force, in registry order. */
export function appliedOn<K extends keyof Modifiers>(
  table: Table, board: Board, pack: DataPack, player: PlayerId, point: K, base: number, ctx: ModifierContext[K],
): Applied {
  const holder = holderIn(table, board, player);
  let kept = PASSIVES.get(holder);
  if (!kept || kept.pack !== pack) PASSIVES.set(holder, kept = { pack, list: passivesOf(pack, holder) });
  return stacked(kept.list, point, base, ctx);
}

/** The players a step of an action concerns, the actor first: a battle and an invasion also concern whoever stands in the active system. */
export function stepPlayers(table: Table, board: Board, actor: PlayerId, step: RuleStep, slot: Slot | null, planetIds: readonly string[]): PlayerId[] {
  if ((step !== 'combat' && step !== 'invasion') || slot === null) return [actor];
  const here = (player: PlayerId): boolean =>
    Object.values(board.systems[slot]?.ships[player] ?? {}).some(n => (n ?? 0) > 0) ||
    planetIds.some(id => Object.values(board.planets[id]?.ground[player] ?? {}).some(n => (n ?? 0) > 0) || board.planets[id]?.owner === player);
  return [actor, ...table.players.map(p => p.id).filter(id => id !== actor && here(id))];
}
type Slot = string;

/** The kinds that come with a faction sheet or a planet: in force without being held as cards, and reminded of through their holder. */
const SHEET_KIND = /^(ability|mech|breakthrough|legendary):/;

/** The reminders a player holds: what they have ready, their secrets and the public objectives not yet scored by them, what their sheet brings. */
function remindersOf(table: Table, board: Board, pack: DataPack, player: PlayerId): string[] {
  const holder = holderIn(table, board, player);
  const { holdings } = holder;
  const objectives = [...holdings.secrets, ...board.common.revealed.filter(id => !holdings.scored.includes(id))];
  const sheet = inForceOf(pack, { holdings, ...(holder.faction === undefined ? {} : { faction: holder.faction }), ...(holder.control ? { control: holder.control } : {}) }).filter(id => SHEET_KIND.test(id));
  // A note of one's own is not played from one's own hand (LRR 69.2).
  const own = (id: string): boolean => id.startsWith('promissory:') && [player, legacyKey(table, player)].includes(noteAddress(id) ?? '');
  return [...readyComponents(pack, holdings), ...objectives, ...sheet].filter(id => !own(id) && effectOf(pack, id)?.tier === 'hint');
}

/**
 * The reminders of steps, for an action of `actor`: each component a player holds ready that speaks of the step and whose
 * `holder` declaration says it speaks in this action. A component held by several, or in several copies, is given once.
 */
export function hintsAtSteps(table: Table, board: Board, pack: DataPack, actor: PlayerId, steps: readonly RuleStep[], concerned?: (step: RuleStep) => readonly PlayerId[]): Map<RuleStep, ComponentDef[]> {
  const held = new Map<string, Set<PlayerId>>();
  for (const player of table.players) {
    for (const id of remindersOf(table, board, pack, player.id)) (held.get(id) ?? held.set(id, new Set()).get(id)!).add(player.id);
  }
  const sorted = [...held.keys()].sort((a, b) => orderOf(pack, a) - orderOf(pack, b));
  return new Map(steps.map(step => {
    const involved = concerned?.(step) ?? [actor];
    const shown = sorted.filter(id => {
      if (effectOf(pack, id)?.hintAt?.includes(step) !== true) return false;
      const rule = holderRuleOf(pack, id);
      return [...held.get(id)!].some(player => speaksIn(rule, player === actor, involved.includes(player)));
    });
    return [step, shown.flatMap(id => componentById(pack, id) ?? [])];
  }));
}


const HOLDINGS = new WeakMap<object, Holdings>();
const holdingsOf = (board: Board, player: PlayerId): Holdings => {
  const cards = board.players[player]?.cards ?? {};
  let known = HOLDINGS.get(cards);
  if (!known) HOLDINGS.set(cards, known = holdingsOfCards(cards));
  return known;
};

/**
 * Whether any component in force for any player has an effect `has` says yes to, or one of the `named` components (the
 * ones an entry plays) has. The one question a step asks before it asks the components anything: where nothing answers,
 * nothing is built to ask.
 */
export function anyInForce(table: Table, board: Board, pack: DataPack, has: (effect: ComponentEffect) => boolean, named: readonly string[] = []): boolean {
  if (named.some(id => { const effect = effectOf(pack, id); return effect !== undefined && has(effect); })) return true;
  for (const player of table.players) {
    if (inForce(table, board, pack, player.id).some(id => { const effect = effectOf(pack, id); return effect !== undefined && has(effect); })) return true;
  }
  return false;
}
