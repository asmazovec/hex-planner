/** Step 89.4 Invasion: ground forces land on the planets of the active system and take control; an opponent's landings too. */
import { MECATOL_PLANETS } from '../mecatol';
import { violation } from '../rules/registry';
import type { DataPack, Game, GameState, UnitCounts, Warning } from '../types';
import { planetsOf } from './board';
import { add, removeUnits, unitIds, type TacticalEntry } from './state';
import { losePlanet } from './structures';

/** Influence spent to remove the custodians token (27.2). */
const CUSTODIANS_COST = 6;

const groundOf = (units: UnitCounts, pack: DataPack): UnitCounts =>
  Object.fromEntries(unitIds(units).filter(id => pack.units[id]?.ground).map(id => [id, units[id]]));

const hasGround = (units: UnitCounts | undefined, pack: DataPack): boolean => unitIds(groundOf(units ?? {}, pack)).length > 0;

/** The custodians token still stands on a Mecatol Rex no one controls and no one has landed on yet. */
const custodiansOn = (state: GameState, planetId: string): boolean =>
  MECATOL_PLANETS.includes(planetId) && state.control[planetId] === undefined && !state.custodiansRemoved;

/**
 * Check, over the state before the landing: only ground forces land (76.1), only on planets of the active system (49.2,
 * 89.4), and no more of a unit than stands in its space area.
 */
export function checkLandings(game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack): Warning[] {
  const planets = planetsOf(game, target, pack);
  const warnings: Warning[] = [];
  const wanted: UnitCounts = {};
  for (const landing of entry.landings) {
    if (!planets.includes(landing.planetId)) {
      if (unitIds(landing.units).length > 0) warnings.push(violation('landingOutsideSystem', { planetId: landing.planetId, systemId: target }));
      continue;
    }
    for (const id of unitIds(landing.units)) {
      if (!pack.units[id]?.ground) warnings.push(violation('shipOnPlanet', { planetId: landing.planetId, unit: id }));
      else wanted[id] = (wanted[id] ?? 0) + (landing.units[id] ?? 0);
    }
  }
  for (const id of unitIds(wanted)) {
    const available = state.systems[target]?.[id] ?? 0;
    const total = wanted[id] ?? 0;
    if (total > available) warnings.push(violation('landingOverLimit', { unit: id, wanted: total, available }));
  }
  return warnings;
}

/**
 * Effect: the ground forces of each landing go from the active system's space onto its planet, as many as were entered;
 * returns the planets something landed on. The first to land on Mecatol Rex removes the custodians token: six influence
 * the plan does not record, so it is warned about, and one victory point (27.2, 27.3, 54.1).
 */
export function landUnits(game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[]): string[] {
  warnings.push(...checkLandings(game, state, target, entry, pack));
  const planets = planetsOf(game, target, pack);
  const landedOn: string[] = [];
  for (const landing of entry.landings) {
    if (!planets.includes(landing.planetId)) continue;
    // What was entered lands: the shortfall is reported as landingOverLimit and forbids nothing; the space area only ends empty.
    const landed = groundOf(landing.units, pack);
    removeUnits(state.systems, target, landed);
    if (unitIds(landed).length === 0) continue;
    if (custodiansOn(state, landing.planetId)) {
      warnings.push(violation('custodians', { planetId: landing.planetId }));
      warnings.push(violation('shortInfluence', { needed: CUSTODIANS_COST, paid: 0 }, 'invasion'));
      for (const each of [state, ...Object.values(state.rivals ?? {})]) each.custodiansRemoved = true;
      state.vp += 1;
    }
    add(state.ground, landing.planetId, landed);
    if (!landedOn.includes(landing.planetId)) landedOn.push(landing.planetId);
  }
  return landedOn;
}

/**
 * Effect after the ground combat (49.5): each planet landed on that still holds the active player's ground forces is
 * theirs, entering exhausted when newly gained (49.5.2); the opponents counted in this state lose it with their
 * structures there (49.5.1).
 */
export function gainControl(state: GameState, landedOn: string[], pack: DataPack): void {
  for (const planetId of landedOn) {
    if (!hasGround(state.ground[planetId], pack)) continue;
    if (state.control[planetId] !== 'me' && !state.exhausted.includes(planetId)) state.exhausted.push(planetId);
    state.control[planetId] = 'me';
    for (const rival of Object.values(state.rivals ?? {})) losePlanet(rival, planetId);
    if (state.rivalHolds) delete state.rivalHolds[planetId];
  }
}

/**
 * Effect on my state of an opponent's tactical action, once their own count has replayed it: each planet they landed on
 * and hold with ground forces is theirs, and I and the other opponents lose it with our structures there (25.5, 49.5.1).
 * The custodians token they removed is gone for everyone, with its point to them.
 */
export function rivalLandings(state: GameState, entry: TacticalEntry, owner: string, pack: DataPack): void {
  const rival = state.rivals?.[owner];
  if (!rival) return;
  for (const { planetId } of entry.landings) {
    if (rival.control[planetId] !== 'me' || !hasGround(rival.ground[planetId], pack)) continue;
    losePlanet(state, planetId);
    if (state.rivalHolds) state.rivalHolds[planetId] = owner;
    for (const [id, other] of Object.entries(state.rivals ?? {})) if (id !== owner) losePlanet(other, planetId);
  }
  if (rival.custodiansRemoved && !state.custodiansRemoved) {
    for (const each of [state, ...Object.values(state.rivals ?? {})]) each.custodiansRemoved = true;
    state.opponentVp[owner] = (state.opponentVp[owner] ?? 0) + 1;
  }
}
