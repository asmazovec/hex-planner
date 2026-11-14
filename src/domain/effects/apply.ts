/** The one way a step of the count asks for a value: the base, then every component of the player in registry order. */
import type { DataPack, Holdings } from '../types';
import { passivesOf, type Holder } from './registry';
import type { Ability, ModifierContext, Modifiers } from './types';

/** A value after the effects, and the components that changed it: the interface names them beside the number. */
export interface Applied { value: number; by: string[] }

/** Runs a point through effects in the order given; only a `passive` effect with that point takes part. */
export function stacked<K extends keyof Modifiers>(
  effects: Iterable<readonly [string, Ability]>, point: K, base: number, ctx: ModifierContext[K],
): Applied {
  let value = base;
  const by: string[] = [];
  for (const [id, effect] of effects) {
    const modify = effect.tier === 'passive' ? effect.modify?.[point] : undefined;
    if (!modify) continue;
    const next = modify(value, ctx);
    if (next !== value) by.push(id);
    value = next;
  }
  return { value, by };
}

/**
 * The value of a point of the count for a player: `base` changed by each component in force for them, in registry
 * order. `who` is a `Holder` (holdings, faction, control, laws: `holderOf`), which also asks the faction sheet, the
 * legendary planets and the laws; holdings alone ask only the cards held. An exhausted component takes part as a ready
 * one does: its passive abilities stay in effect (LRR 34.4.1). One the pack does not know does not.
 */
export function applied<K extends keyof Modifiers>(
  pack: DataPack, who: Holdings | Holder, point: K, base: number, ctx: ModifierContext[K],
): Applied {
  return stacked(passivesOf(pack, who), point, base, ctx);
}
