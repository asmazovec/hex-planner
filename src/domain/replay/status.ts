/** The status phase (LRR 81): tokens gained and redistributed, points scored, then the board cleared and every card readied. */
import { componentById } from '../components';
import { applied } from '../effects/apply';
import { appliedFor } from '../effects/entryApply';
import fleetPoolTokens from '../rules/codes/fleetPoolTokens';
import { effectOf, holderOf } from '../effects/registry';
import objectiveRepeated from '../rules/codes/objectiveRepeated';
import objectivesPerPhase from '../rules/codes/objectivesPerPhase';
import scoreWithoutHome from '../rules/codes/scoreWithoutHome';
import { violation } from '../rules/registry';
import { homePlanets, STATUS_TOKENS } from '../strategy';
import type { DataPack, Entry, Game, GameState, RuleStep, Warning } from '../types';
import { objectiveNotMet } from '../effects/points/status';
import { dockFighterRoom, fleetCount, fleetLimit } from './transport';

/** The command tokens of a faction (LRR 20.3, 23.2): those not in the pools or on the board are in reinforcements. */
export const TOKEN_LIMIT = 16;

type Pools = Partial<Record<'tactic' | 'fleet' | 'strategy', number>>;

/** Check: no more tokens gained than the step or card gives. */
export function checkTokensGiven(given: number, free: number, step?: RuleStep): Warning[] {
  return given > free ? [violation('tokensOver', { given, free }, step)] : [];
}

/**
 * The command tokens a player gains in the status phase (81.5): two, changed by the components in force for them and by
 * those the entry names in `uses` (the `tokensGained` point at the step `status`). `state` is the owner's, `shared` mine.
 */
export function statusTokensFree(game: Game, state: GameState, shared: GameState, entry: Entry, pack: DataPack): number {
  return appliedFor(pack, holderOf(game, state, shared), entry, 'tokensGained', STATUS_TOKENS, { step: 'status' }, state).value;
}

/** Check: the tokens in the pools, and with `onBoard` those on the board, are more than the sixteen of a faction (20.3.1). */
export function checkReinforcements(state: GameState, onBoard: boolean, step?: RuleStep): Warning[] {
  const total = state.tactic + state.fleet + state.strategy + (onBoard ? state.tokensOnMap.length : 0);
  return total > TOKEN_LIMIT ? [violation('noReinforcements', { total, limit: TOKEN_LIMIT }, step)] : [];
}

/** Check: after the fleet pool shrank, a system holds more ships than it allows (37.3, 81.5.1). */
export function checkFleetPool(game: Game, state: GameState, pack: DataPack, step?: RuleStep): Warning[] {
  const limit = fleetLimit(game, state, pack);
  return Object.entries(state.systems).flatMap(([systemId, units]) => {
    const ships = fleetCount(game, units, state.holdings, pack, dockFighterRoom(game, state, systemId, pack));
    return ships > limit ? [violation('fleetPool', { systemId, ships, fleet: limit }, step)] : [];
  });
}

/** Check: more tokens in the fleet pool than a game effect allows (the `fleetPoolMax` point; none by itself, Fleet Regulations sets 4). `shared` is mine, which keeps the laws. */
export function checkFleetPoolMax(game: Game, state: GameState, pack: DataPack, shared: GameState = state, step: RuleStep = 'status'): Warning[] {
  const limit = applied(pack, holderOf(game, state, shared), 'fleetPoolMax', Number.POSITIVE_INFINITY, { faction: game.faction }).value;
  return state.fleet > limit ? [violation(fleetPoolTokens.code, { fleet: state.fleet, limit }, step)] : [];
}

/**
 * Checks of the pools after a card changed them: tokens gained past the sixteen, counting those on the board, the fleet
 * pool past what a law allows, and a fleet pool lowered below the ships standing anywhere.
 */
export function checkPoolChange(game: Game, state: GameState, pack: DataPack, change: Pools | undefined, step?: RuleStep, shared: GameState = state): Warning[] {
  const gained = (change?.tactic ?? 0) + (change?.fleet ?? 0) + (change?.strategy ?? 0);
  return [
    ...(gained > 0 ? checkReinforcements(state, true, step) : []),
    ...((change?.fleet ?? 0) > 0 ? checkFleetPoolMax(game, state, pack, shared, step) : []),
    ...((change?.fleet ?? 0) < 0 ? checkFleetPool(game, state, pack, step) : []),
  ];
}

/**
 * Steps 81.1 and 81.5: points scored, two tokens gained and the pools redistributed. The board is already clear (81.4),
 * so only the pools count against the sixteen tokens.
 */
export function applyStatusTokens(
  game: Game, state: GameState, entry: Extract<Entry, { type: 'statusTokens' }>, pack: DataPack, warnings: Warning[], shared: GameState = state,
): void {
  warnings.push(...checkTokensGiven(entry.tactic + entry.fleet + entry.strategy, statusTokensFree(game, state, shared, entry, pack)));
  for (const pool of ['tactic', 'fleet', 'strategy'] as const) {
    state[pool] += entry[pool];
    if (entry[pool] < 0 && state[pool] < 0) warnings.push(violation('poolNegative', { pool, have: state[pool] }, 'status'));
  }
  if (entry.tactic + entry.fleet + entry.strategy > 0) warnings.push(...checkReinforcements(state, false));
  if (entry.fleet < 0) warnings.push(...checkFleetPool(game, state, pack, 'status'));
  if (entry.fleet > 0) warnings.push(...checkFleetPoolMax(game, state, pack, shared));
  state.vp += entry.vp ?? 0;
  for (const [id, points] of Object.entries(entry.opponentVp ?? {})) {
    if (id in state.opponentVp) state.opponentVp[id] += points;
  }
}

/** Steps 81.4 and 81.6, for every player at once: the command tokens leave the board and every exhausted planet is readied. */
export function clearBoard(states: GameState[]): void {
  for (const state of states) {
    state.exhausted = [];
    state.tokensOnMap = [];
  }
}

const isPublic = (id: string): boolean => id.startsWith('publicObjective:');
const isSecret = (id: string): boolean => id.startsWith('secretObjective:');

/**
 * Step 81.1, before the entry changes anything: what the objectives it scores must meet. At most one public and one
 * secret one (61.6), none twice by the same player (61.8), a public one only while every planet of the home system is
 * controlled (61.16), and the requirement of each objective's effect (61.5.1, `requirement`). The score of the objective's
 * own `play` (a cost, a count the replay keeps) comes with the entry's other plays. `state` is the owner's board before
 * the entry, `shared` mine.
 */
export function checkObjectives(
  game: Game, state: GameState, shared: GameState, entry: Extract<Entry, { type: 'statusTokens' }>, pack: DataPack, warnings: Warning[],
): void {
  const scored = (entry.scored ?? []).filter(id => componentById(pack, id) !== undefined);
  for (const [kind, test] of [['public', isPublic], ['secret', isSecret]] as const) {
    const count = scored.filter(test).length;
    if (count > 1) warnings.push(violation(objectivesPerPhase.code, { kind, count }, 'status'));
  }
  const homeHeld = homePlanets(game, pack).every(planetId => state.control[planetId] === 'me');
  scored.forEach((id, index) => {
    if (state.holdings.scored.includes(id) || scored.indexOf(id) !== index) warnings.push(violation(objectiveRepeated.code, { objective: id }, 'status'));
    if (isPublic(id) && !homeHeld) warnings.push(violation(scoreWithoutHome.code, { objective: id }, 'status'));
    const need = effectOf(pack, id)?.requirement?.({ pack, game, state, shared, entry, objective: id });
    if (need && need.have < need.need) warnings.push(objectiveNotMet(id, need.have, need.need));
  });
}
