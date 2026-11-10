/** The one way a step of the count asks for a value: the base, then every ready component of the player in registry order. */
import type { DataPack, Holdings } from '../types';
import { passivesOf } from './registry';
import type { ComponentEffect, ModifierContext, Modifiers } from './types';

/** A value after the effects, and the components that changed it: the interface names them beside the number. */
export interface Applied { value: number; by: string[] }

/** Runs a point through effects in the order given; only a `passive` effect with that point takes part. */
export function stacked<K extends keyof Modifiers>(
  effects: Iterable<readonly [string, ComponentEffect]>, point: K, base: number, ctx: ModifierContext[K],
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
 * The value of a point of the count for a player: `base` changed by each component they hold ready, in registry
 * order. An exhausted component does not take part, and neither does one the pack does not know.
 */
export function applied<K extends keyof Modifiers>(
  pack: DataPack, holdings: Holdings, point: K, base: number, ctx: ModifierContext[K],
): Applied {
  return stacked(passivesOf(pack, holdings), point, base, ctx);
}
