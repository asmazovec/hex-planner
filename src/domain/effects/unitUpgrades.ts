/**
 * Unit upgrades as passive effects (LRR 97.4, 90.6.1): the technology that upgrades a unit puts the numbers of its
 * level II in place of the printed ones. Nothing is typed here: the numbers come from `UnitDef.levels`, the faction's
 * own ships (`FactionDef.ships`) and `StructureDef.levels`, so one effect serves every faction that may hold it.
 *
 * An upgrade sets the level instead of adding to it: two technologies for the same unit (the common one and a
 * faction's own) give level II once. It therefore stands before every other effect in the registry.
 */
import type { DataPack, ShipStats, StructureKind, TechDef, UnitId } from '../types';
import { unitStats } from '../unitStats';
import type { ComponentEffect, Modifiers } from './types';

const RULE = '97.4';

/** One number of level II of a unit for the faction asking; the value stays where the faction has no level II of it. */
const levelTwo = (pack: DataPack, unit: UnitId, pick: (stats: ShipStats) => number | null) =>
  (value: number, ctx: { faction: string; unit: UnitId }): number => {
    if (ctx.unit !== unit) return value;
    const two = unitStats(ctx.faction, unit, true, pack);
    return two ? pick(two) ?? 0 : value;
  };

function unitModifiers(pack: DataPack, unit: UnitId): Partial<Modifiers> {
  return {
    speed: levelTwo(pack, unit, stats => stats.move),
    capacity: levelTwo(pack, unit, stats => stats.capacity),
    unitCost: levelTwo(pack, unit, stats => stats.cost),
  };
}

/** Space Dock II: the dock's Production is its planet's resources plus the value of level II (79.1). A PDS has no number the app counts. */
function structureModifiers(pack: DataPack, structure: StructureKind): Partial<Modifiers> {
  const two = pack.structures.find(s => s.id === structure)?.levels.two;
  if (two?.production === undefined) return {};
  const production = two.production;
  return {
    productionValue: (value, ctx) => (ctx.structure === structure ? (pack.planets[ctx.planetId]?.resources ?? 0) + production : value),
  };
}

const isStructure = (upgrade: UnitId | StructureKind): upgrade is StructureKind => upgrade === 'pds' || upgrade === 'spacedock';

/** The effect of one unit upgrade technology. */
export function unitUpgradeEffect(pack: DataPack, tech: TechDef): ComponentEffect | undefined {
  if (!tech.upgrade) return undefined;
  return { tier: 'passive', rule: RULE, modify: isStructure(tech.upgrade) ? structureModifiers(pack, tech.upgrade) : unitModifiers(pack, tech.upgrade) };
}

/** Every unit upgrade technology of the pack with its effect, by component id. */
export function unitUpgradeEffects(pack: DataPack): [string, ComponentEffect][] {
  return Object.values(pack.technologies).flatMap((tech): [string, ComponentEffect][] => {
    const effect = unitUpgradeEffect(pack, tech);
    return effect ? [[`technology:${tech.id}`, effect]] : [];
  });
}
