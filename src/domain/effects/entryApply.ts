/**
 * A number that changes only for the entry that names the component: a `play` effect with `modify` (Harrugh Gefhara:
 * the cost of each unit is 0 in this use of PRODUCTION; War Machine: +4 to the total Production). The same points as a
 * passive effect, the same order (passive in registry order, then what the entry plays), asked the same way, with the
 * entry. A component named twice counts once (War Machine ruling 1). The component need not be held: a play of one
 * not held is warned of apart.
 */
import type { DataPack, Entry, Holdings } from '../types';
import { applied, type Applied } from './apply';
import { effectOf, type Holder } from './registry';
import type { ModifierContext, Modifiers } from './types';
import { playedBy } from './waivers';
import './points/production';

export function appliedFor<K extends keyof Modifiers>(
  pack: DataPack, who: Holdings | Holder, entry: Entry | undefined, point: K, base: number, ctx: ModifierContext[K],
): Applied {
  const result = applied(pack, who, point, base, ctx);
  if (!entry) return result;
  for (const id of playedBy(entry)) {
    const effect = effectOf(pack, id);
    const modify = effect && effect.tier !== 'passive' ? effect.modify?.[point] : undefined;
    if (!modify) continue;
    const next = modify(result.value, ctx);
    if (next !== result.value) result.by.push(id);
    result.value = next;
  }
  return result;
}
