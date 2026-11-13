/**
 * Structures a Construction card places (LRR 24.2, 24.3, 85.4-85.6): the primary places one PDS or space dock and may
 * add one PDS, the secondary one structure in the system that got its token; each goes on a planet the player controls,
 * within what a planet holds and what the reinforcements hold (24.4). A structure beyond a limit is warned about and
 * still placed where the board can count it. The placing is events; the board is read through queries.
 */
import { violation } from '../../domain/rules/registry';
import type { StructureKind } from '../../domain/types';
import { ownerOf, planetsOf } from '../queries';
import { planetsIn } from '../space';
import { emit, warn, type Ctx } from './context';

/** Most of one kind a planet holds (24 notes 1-2, 63.3, 79.3, 85.4, 85.5). */
export const PER_PLANET: Record<StructureKind, number> = { spacedock: 1, pds: 2 };

const onPlanet = (ctx: Ctx, kind: StructureKind, planet: string): number =>
  ownerOf(ctx.board, planet) === ctx.player ? ctx.board.planets[planet].structures[kind] ?? 0 : 0;

const inAll = (ctx: Ctx, kind: StructureKind): number =>
  planetsOf(ctx.board, ctx.player).reduce((sum, planet) => sum + (ctx.board.planets[planet].structures[kind] ?? 0), 0);

export function buildStructures(
  ctx: Ctx, structures: { kind: StructureKind; planetId: string }[], primary: boolean, systemId: string | undefined,
): void {
  const docks = structures.filter(s => s.kind === 'spacedock').length;
  if (structures.length > (primary ? 2 : 1) || docks > 1) {
    warn(ctx, violation('structureLimit', { kind: docks > 1 ? 'spacedock' : 'pds', count: structures.length }));
  }
  const inSystem = !primary && systemId !== undefined ? planetsIn(ctx.table, ctx.board, ctx.pack, systemId) : null;
  for (const { kind, planetId } of structures) {
    if (ownerOf(ctx.board, planetId) !== ctx.player) warn(ctx, violation('structureNotControlled', { planetId }));
    if (inSystem && !inSystem.includes(planetId)) warn(ctx, violation('structureOutsideSystem', { planetId, systemId: systemId ?? '' }));
    if (onPlanet(ctx, kind, planetId) >= PER_PLANET[kind]) warn(ctx, violation('structureLimit', { kind, planetId, count: PER_PLANET[kind] }));
    const limit = ctx.pack.structures.find(s => s.id === kind)?.limit ?? null;
    if (limit !== null && inAll(ctx, kind) >= limit) warn(ctx, violation('structureLimit', { kind, count: limit }));
    // A second dock on a planet stays one (the planet holds one); a PDS is counted.
    if (kind === 'spacedock' && onPlanet(ctx, kind, planetId) > 0) continue;
    emit(ctx, [{ type: 'StructurePlaced', player: ctx.player, at: { planet: planetId }, structures: { [kind]: 1 } }], { quiet: true });
  }
}
