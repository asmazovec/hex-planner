/**
 * A number that changes only for the entry that names the component: a `play` effect with `modify` (Harrugh Gefhara:
 * the cost of each unit is 0 in this use of PRODUCTION; War Machine: +4 to the total Production). The same points as a
 * passive effect, the same order (passive in registry order, then what the entry plays), asked the same way, with the
 * entry. A component named twice counts once (War Machine ruling 1). The one `appliedFor` of the program.
 *
 * With `state` (the owner's board before the entry) a component the entry names counts only while its owner holds it
 * ready: held and not exhausted (status points: Overrule, Cybernetic Enhancements). Without it the component need not
 * be held: a play of one not held is warned of apart (`componentNotHeld`). A promissory note of the entry owner's own
 * does not count in either case: the player cannot play it (69.2, `ownPromissory`).
 */
import { componentById, noteAddress } from '../components';
import { holds, isExhausted } from '../replay/holdings';
import type { DataPack, Entry, GameState, Holdings } from '../types';
import { applied, type Applied } from './apply';
import { effectOf, type Holder } from './registry';
import type { ModifierContext, Modifiers } from './types';
import { playedBy } from './waivers';
import './points/production';

/** Whether the owner holds the component ready on the board before the entry. */
const ready = (pack: DataPack, state: GameState | undefined, id: string): boolean => {
  const def = componentById(pack, id);
  return !state || !def || (holds(state.holdings, def) && !isExhausted(state.holdings, def));
};

export function appliedFor<K extends keyof Modifiers>(
  pack: DataPack, who: Holdings | Holder, entry: Entry | undefined, point: K, base: number, ctx: ModifierContext[K], state?: GameState,
): Applied {
  const result = applied(pack, who, point, base, ctx);
  if (!entry) return result;
  for (const id of playedBy(entry)) {
    const effect = effectOf(pack, id);
    const modify = effect?.tier === 'play' ? effect.modify?.[point] : undefined;
    if (!modify || noteAddress(id) === (entry.owner ?? 'me') || !ready(pack, state, id)) continue;
    const next = modify(result.value, ctx);
    if (next !== result.value) result.by.push(id);
    result.value = next;
  }
  return result;
}
