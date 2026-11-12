/** Step 89.4 Invasion: ground forces land on the planets of the active system and take control; an opponent's landings too. */
import '../effects/points/invasion';
import '../effects/points/rivals';
import { applied } from '../effects/apply';
import { hooked, run } from '../effects/points/moments';
import type { ControlTurn } from '../effects/points/invasion';
import { effectOf, holderOf, inForceOf, orderOf } from '../effects/registry';
import { playedBy } from '../effects/waivers';
import { MECATOL_PLANETS } from '../mecatol';
import { violation } from '../rules/registry';
import { gameAs } from '../players';
import { inHomeSystem } from '../stacks';
import type { AnyWarningCode, DataPack, Entry, Game, GameState, RuleStep, UnitCounts, Warning } from '../types';
import { planetsOf } from './board';
import { add, missingUnits, removeUnits, unitIds, type TacticalEntry } from './state';
import { losePlanet, structuresOn } from './structures';

const code = (name: string): AnyWarningCode => name as AnyWarningCode;

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
  for (const [planetId, units] of Object.entries(fromPlanets)) warnings.push(...missingUnits(state.ground, planetId, units, 'invasion'));
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
export function landUnits(game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[], shared: GameState = state): string[] {
  warnings.push(...checkLandings(game, state, target, entry, pack));
  const planets = planetsOf(game, target, pack);
  const landedOn: string[] = [];
  for (const landing of entry.landings) {
    if (!planets.includes(landing.planetId)) continue;
    // What was entered lands: the shortfall is reported as landingOverLimit and forbids nothing; the space area only ends empty.
    const landed = groundOf(landing.units, pack);
    if (landing.from !== undefined) removeUnits(state.ground, landing.from, landed);
    else removeUnits(state.systems, target, landed);
    if (unitIds(landed).length === 0) continue;
    if (custodiansOn(state, landing.planetId)) {
      warnings.push(violation('custodians', { planetId: landing.planetId }));
      warnings.push(violation('shortInfluence', { needed: CUSTODIANS_COST, paid: 0 }, 'invasion'));
      for (const each of [state, ...Object.values(state.rivals ?? {})]) each.custodiansRemoved = true;
      state.vp += 1;
    }
    reactToLanding(game, state, shared, entry, landing.planetId, unitIds(landed).reduce((sum, unit) => sum + (landed[unit] ?? 0), 0), pack, warnings);
    add(state.ground, landing.planetId, landed);
    if (!landedOn.includes(landing.planetId)) landedOn.push(landing.planetId);
  }
  return landedOn;
}

/** The ids of the components an entry names: what it plays, spends, uses and gains. */
const namedBy = (entry: Entry | undefined): string[] => (entry ? [...playedBy(entry), ...(entry.gains ?? [])] : []);

/**
 * Effect: the player of `state` gains control of one planet (25.1, 49.5): it is theirs and, newly gained, exhausted
 * (49.5.2); every opponent counted in this state loses it with their structures there (49.5.1). Then each component
 * hooked on the gain (`onGainControl`) runs: the passive ones in force, and the play ones the entry names; and the
 * trade goods the point `tradeGoodsOnControl` asks are added. A planet already theirs changes nothing; returns whether
 * it was newly gained. Used by the landing and by every component that gives a planet.
 */
export function takeControl(game: Game, state: GameState, planetId: string, pack: DataPack, warnings: Warning[], entry?: Entry): boolean {
  if (state.control[planetId] === 'me') return false;
  const fromPlayer = state.control[planetId] === 'enemy';
  const lost = structuresOn(state, planetId).filter(s => s.owner !== 'me');
  if (!state.exhausted.includes(planetId)) state.exhausted.push(planetId);
  state.control[planetId] = 'me';
  for (const rival of Object.values(state.rivals ?? {})) losePlanet(rival, planetId);
  if (state.rivalHolds) delete state.rivalHolds[planetId];
  const holder = holderOf(game, state);
  const ids = new Set([
    ...inForceOf(pack, holder, effect => effect.tier === 'passive' && effect.onGainControl !== undefined),
    ...namedBy(entry).filter(id => effectOf(pack, id)?.tier === 'play' && effectOf(pack, id)?.onGainControl !== undefined),
  ]);
  const turn: ControlTurn = {
    game, state, pack, warnings, planetId, entry, fromPlayer, explores: !fromPlayer, lost,
    choices: (entry as { choices?: Record<string, string | number> } | undefined)?.choices ?? {},
  };
  for (const id of [...ids].sort((a, b) => orderOf(pack, a) - orderOf(pack, b))) effectOf(pack, id)?.onGainControl?.(turn);
  state.tradeGoods += applied(pack, holder, 'tradeGoodsOnControl', 0, { planetId }).value;
  return true;
}

/** Effect after the ground combat (49.5): each planet landed on that still holds the active player's ground forces is theirs (`takeControl`). */
export function gainControl(game: Game, state: GameState, landedOn: string[], pack: DataPack, warnings: Warning[], entry?: Entry): void {
  for (const planetId of landedOn) {
    if (hasGround(state.ground[planetId], pack)) takeControl(game, state, planetId, pack, warnings, entry);
  }
}

/** The planets that are mine in `after` and were not in `before`: what an entry gained, for a waiver that asks what the entry took. */
export const controlGained = (before: Pick<GameState, 'control'>, after: Pick<GameState, 'control'>): string[] =>
  Object.keys(after.control).filter(planetId => after.control[planetId] === 'me' && before.control[planetId] !== 'me');

/**
 * Effect of an ability or card that places units on a planet: they are added to it; a planet the player does not
 * control is warned of (67.4.1) and gets them all the same. Reinforcement limits are not counted here.
 */
export function placeOnPlanet(state: GameState, planetId: string, units: UnitCounts, warnings: Warning[], step?: RuleStep): void {
  if (state.control[planetId] !== 'me') warnings.push(violation(code('placeNotControlled'), { planetId }, step));
  add(state.ground, planetId, units);
}

/**
 * The condition of the exploration cards that read "if you have at least 1 mech on this planet, or if you remove 1
 * infantry from it" (35.2): a mech keeps everything, else one infantry is removed. With neither it warns
 * (`explorationCondition`) and returns false: the card's gain is then not made.
 */
export function exploreCondition(state: GameState, planetId: string, warnings: Warning[]): boolean {
  const here = state.ground[planetId] ?? {};
  if ((here.mech ?? 0) > 0) return true;
  if ((here.infantry ?? 0) > 0) {
    removeUnits(state.ground, planetId, { infantry: 1 });
    return true;
  }
  warnings.push(violation(code('explorationCondition'), { planetId }));
  return false;
}

/**
 * Effect of a card attached to a planet: it joins `state.attachments` (the whole game's, on my state). A target the
 * card does not allow is warned of (`attachTarget`, `reason`: notControlled, home or legendary) and still gets it.
 */
export function attachCard(
  game: Game, state: GameState, planetId: string, cardId: string, pack: DataPack, warnings: Warning[],
  limits: { notHome?: boolean; notLegendary?: boolean } = {},
): void {
  const reason = state.control[planetId] !== 'me' ? 'notControlled'
    : limits.notHome && inHomeSystem(game, planetId, pack) ? 'home'
      : limits.notLegendary && pack.planets[planetId]?.legendary !== undefined ? 'legendary' : undefined;
  if (reason) warnings.push(violation(code('attachTarget'), { planetId, reason }));
  const attached = (state.attachments ??= {});
  attached[planetId] = [...(attached[planetId] ?? []), cardId];
}

/**
 * Effect on the way to a landing: every other player's components in force that answer a landing on a planet
 * (`onLanding`) are asked, the owner of the component being any player but the lander. `shared` is my state, which
 * holds every player's own. A component may push warnings (a cost its owner imposes) or change a state.
 */
export function reactToLanding(game: Game, state: GameState, shared: GameState, entry: TacticalEntry, planetId: string, landed: number, pack: DataPack, warnings: Warning[]): void {
  const lander = entry.owner ?? 'me';
  const states: Record<string, GameState> = { ...(shared.rivals ?? {}), me: shared, [lander]: state };
  for (const [owner, own] of Object.entries(states)) {
    if (owner === lander) continue;
    const ownerGame = gameAs(game, owner);
    for (const id of inForceOf(pack, holderOf(ownerGame, own, shared), effect => effect.onLanding !== undefined)) {
      effectOf(pack, id)!.onLanding!({ id, game: ownerGame, pack, owner, lander, planetId, landed, state: own, landerState: state, shared, warnings });
    }
  }
}

/**
 * Effect on my state of an opponent's tactical action, once their own count has replayed it: each planet they landed on
 * and hold with ground forces is theirs, and I and the other opponents lose it with our structures there (25.5, 49.5.1).
 * The custodians token they removed is gone for everyone, with its point to them.
 */
export function rivalLandings(state: GameState, entry: TacticalEntry, owner: string, pack: DataPack, game?: Game, warnings: Warning[] = []): void {
  const rival = state.rivals?.[owner];
  if (!rival) return;
  for (const { planetId } of entry.landings) {
    if (rival.control[planetId] !== 'me' || !hasGround(rival.ground[planetId], pack)) continue;
    // What I lose with the planet is asked before it goes: a legendary planet is in force only while I control it.
    const lost = game && state.control[planetId] === 'me' ? hooked('onControlLost', { game, state, shared: state, pack }) : [];
    losePlanet(state, planetId);
    if (game) run('onControlLost', lost, { game, state, shared: state, pack, warnings, entry, states: { me: state, ...state.rivals } }, { planetId, to: owner });
    if (state.rivalHolds) state.rivalHolds[planetId] = owner;
    for (const [id, other] of Object.entries(state.rivals ?? {})) if (id !== owner) losePlanet(other, planetId);
  }
  if (rival.custodiansRemoved && !state.custodiansRemoved) {
    for (const each of [state, ...Object.values(state.rivals ?? {})]) each.custodiansRemoved = true;
    state.opponentVp[owner] = (state.opponentVp[owner] ?? 0) + 1;
  }
}
