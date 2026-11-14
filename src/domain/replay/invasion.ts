/** Step 89.4 Invasion: ground forces land on the planets of the active system and take control; an opponent's landings too. */
import '../effects/points/invasion';
import '../effects/points/rivals';
import { violation } from '../rules/registry';
import type { AnyWarningCode, DataPack, UnitCounts, Warning } from '../types';
import { planetsOf, type MapSource } from './board';
import { add, missingUnits, unitIds, type TacticalEntry } from './state';

export const code = (name: string): AnyWarningCode => name as AnyWarningCode;

export const groundOf = (units: UnitCounts, pack: DataPack): UnitCounts =>
  Object.fromEntries(unitIds(units).filter(id => pack.units[id]?.ground).map(id => [id, units[id]]));

export const hasGround = (units: UnitCounts | undefined, pack: DataPack): boolean => unitIds(groundOf(units ?? {}, pack)).length > 0;

/** The same over what stands in the active system's space area and on the planets, from wherever they are read. */
export function checkLandingsOf(game: MapSource, ships: UnitCounts, groundOn: (planetId: string) => UnitCounts, target: string, entry: Pick<TacticalEntry, 'landings'>, pack: DataPack): Warning[] {
  const planets = planetsOf(game, target, pack);
  const warnings: Warning[] = [];
  const wanted: UnitCounts = {};
  /** What is committed from each planet (49.2 names the space area only): it is warned of and taken from that planet. */
  const fromPlanets: Record<string, UnitCounts> = {};
  for (const landing of entry.landings) {
    if (!planets.includes(landing.planetId)) {
      if (unitIds(landing.units).length > 0) warnings.push(violation('landingOutsideSystem', { planetId: landing.planetId, systemId: target }));
      continue;
    }
    const ground = groundOf(landing.units, pack);
    const source = unitIds(ground).length > 0 ? landing.from : undefined;
    if (source !== undefined) {
      const count = unitIds(ground).reduce((sum, id) => sum + (ground[id] ?? 0), 0);
      warnings.push(violation(code('landingFromPlanet'), { planetId: landing.planetId, from: source, unit: unitIds(ground)[0], count }));
      add(fromPlanets, source, ground);
    }
    for (const id of unitIds(landing.units)) {
      if (!pack.units[id]?.ground) warnings.push(violation('shipOnPlanet', { planetId: landing.planetId, unit: id }));
      else if (source === undefined) wanted[id] = (wanted[id] ?? 0) + (landing.units[id] ?? 0);
    }
  }
  for (const [planetId, units] of Object.entries(fromPlanets)) warnings.push(...missingUnits({ [planetId]: groundOn(planetId) }, planetId, units, 'invasion'));
  for (const id of unitIds(wanted)) {
    const available = ships[id] ?? 0;
    const total = wanted[id] ?? 0;
    if (total > available) warnings.push(violation('landingOverLimit', { unit: id, wanted: total, available }));
  }
  return warnings;
}
