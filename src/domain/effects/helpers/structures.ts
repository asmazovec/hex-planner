import type { AbilityContext, GameEvent } from '../../../game/abilities/types';

/** "Place the structures that stood there": what a planet gained takes over from its old owner (Assimilate, Infiltrate): a PDS per PDS, one space dock if there is none. */
export function keepStructures(ctx: AbilityContext, planetId: string, lost: readonly { kind: 'pds' | 'spacedock'; count: number }[]): GameEvent[] {
  const docked = ctx.my.planets().find(planet => planet.id === planetId)?.structures.spacedock ?? 0;
  return lost.flatMap((structure): GameEvent[] => structure.kind === 'pds'
    ? [{ type: 'StructurePlaced', player: ctx.holder, at: { planet: planetId }, structures: { pds: structure.count } }]
    : docked > 0 ? [] : [{ type: 'StructurePlaced', player: ctx.holder, at: { planet: planetId }, structures: { spacedock: 1 } }]);
}
