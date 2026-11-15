import type { Table } from '../../../game/types';
import type { Turn } from '../../../game/actions';
import type { Entry } from '../domain/types';
import { factsOf } from '../../../game/turnFacts';
import { legacyKey, toOld } from './keys';

/**
 * A turn of the kernel read back as the old entry it stands for (the inverse of `turnOf`): its player is the owner by
 * the old id (none for me), and every player it names (the other side of a transaction, a choice, the address of a note,
 * the speaker a card names) goes by the old id too. A status turn's points are my `vp` and the rivals' `opponentVp`.
 */
export function entryOf(table: Table, turn: Turn): Entry {
  const { player, ...facts } = factsOf(turn) as ReturnType<typeof factsOf> & { points?: Record<string, number> };
  const owner = legacyKey(table, player);
  const out = <T,>(value: T): T => toOld(table, value);
  const entry: Record<string, unknown> = { ...facts };
  for (const field of ['gains', 'spends', 'uses', 'useChoices', 'choices', 'componentId'] as const) {
    if (entry[field] !== undefined) entry[field] = out(entry[field]);
  }
  if (Array.isArray(entry.acts)) {
    entry.acts = (entry.acts as { kind: string; with?: string; give?: { components?: string[] }; get?: { components?: string[] } }[]).map(act => (act.kind !== 'transaction' ? act : {
      ...act, with: legacyKey(table, act.with!),
      give: act.give?.components ? { ...act.give, components: out(act.give.components) } : act.give,
      get: act.get?.components ? { ...act.get, components: out(act.get.components) } : act.get,
    }));
  }
  const effects = entry.effects as { speaker?: string; freeSecondary?: string[] } | undefined;
  if (effects && (effects.speaker !== undefined || effects.freeSecondary)) {
    entry.effects = { ...effects, ...(effects.speaker === undefined ? {} : { speaker: legacyKey(table, effects.speaker) }), ...(effects.freeSecondary ? { freeSecondary: effects.freeSecondary.map(id => legacyKey(table, id)) } : {}) };
  }
  if (facts.type === 'statusTokens') {
    const { points } = facts;
    delete entry.points;
    if (points && points[player] !== undefined) entry.vp = points[player];
    const rivals = Object.entries(points ?? {}).filter(([id]) => id !== player);
    if (rivals.length > 0 || (points && Object.keys(points).length === 0)) entry.opponentVp = Object.fromEntries(rivals.map(([id, n]) => [legacyKey(table, id), n]));
  }
  return { ...entry, ...(owner === 'me' ? {} : { owner }) } as Entry;
}

/** The old entries a strategic turn's nested actions were made from (Warfare's free action, `fromCard` the card). */
export const nestedEntries = (table: Table, turn: Turn): Entry[] =>
  turn.action.kind === 'strategic' ? (turn.action.nested ?? []).map(n => ({ ...entryOf(table, n), fromCard: turn.id }) as Entry) : [];
