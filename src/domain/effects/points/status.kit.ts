/** A throwaway effect for the tests of the status infrastructure: the registry of a bench's pack takes it in place of a component's own. */
import type { DataPack } from '../../types';
import { effectsOf } from '../registry';
import type { ComponentEffect } from '../types';

/** Puts `effect` in the registry of `pack` under `id`, which the pack must know. Call it before the plan is replayed. */
export function withEffect(pack: DataPack, id: string, effect: ComponentEffect): void {
  const effects = effectsOf(pack) as Map<string, ComponentEffect>;
  if (!effects.has(id)) throw new Error(`no component ${id}`);
  effects.set(id, effect);
}
