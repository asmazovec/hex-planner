/**
 * The status phase (LRR 81) for the player whose turn it is: the objectives are asked against the board before the entry
 * (81.1), then the tokens gained and redistributed (81.5), the points, and the objectives scored. The board is already
 * clear (81.4), so only the pools count against the sixteen tokens. The checks are the domain's pure ones.
 */
import { componentById } from '../../domain/components';
import { objectiveNotMet, type RequirementContext } from '../../domain/effects/points/status';
import { effectOf } from '../../domain/effects/registry';
import { productionLimit } from '../queries';
import { checkTokensGiven } from '../../domain/replay/status';
import objectiveRepeated from '../../domain/rules/codes/objectiveRepeated';
import objectivesPerPhase from '../../domain/rules/codes/objectivesPerPhase';
import scoreWithoutHome from '../../domain/rules/codes/scoreWithoutHome';
import { violation } from '../../domain/rules/registry';
import type { Warning } from '../../domain/types';
import type { TurnFacts } from '../turnFacts';
import type { GameEvent } from '../events';
import { playerOfKey } from '../keys';
import { fleetPoolMaxWarnings, fleetPoolWarnings, planetsOf, readyPlanets, reinforcementWarnings, shipsIn, groundOn, statusTokensFree } from '../queries';
import { slotsOf, mapSource } from '../space';
import { contextOf } from './hooks';
import { emit, warn, type Ctx } from './context';
import { applyScored } from './holdings';

type StatusEntry = Extract<TurnFacts, { type: 'statusTokens' }>;
const POOLS = ['tactic', 'fleet', 'strategy'] as const;

function statusTokens(ctx: Ctx, entry: StatusEntry): void {
  warn(ctx, checkTokensGiven(entry.tactic + entry.fleet + entry.strategy, statusTokensFree(ctx.table, ctx.board, ctx.pack, ctx.player, entry)));
  for (const pool of POOLS) {
    if (entry[pool] === 0) continue;
    const have = ctx.board.players[ctx.player]?.pools[pool] ?? 0;
    if (entry[pool] < 0 && have + entry[pool] < 0) warn(ctx, violation('poolNegative', { pool, have: have + entry[pool] }, 'status'));
    emit(ctx, [{ type: 'TokensChanged', player: ctx.player, delta: { [pool]: entry[pool] } }], { quiet: true });
  }
  if (entry.tactic + entry.fleet + entry.strategy > 0) warn(ctx, reinforcementWarnings(ctx.board, ctx.player, false));
  if (entry.fleet < 0) warn(ctx, fleetPoolWarnings(ctx.table, ctx.board, ctx.pack, ctx.player, 'status'));
  if (entry.fleet > 0) warn(ctx, fleetPoolMaxWarnings(ctx.table, ctx.board, ctx.pack, ctx.player));
  const points: GameEvent[] = [];
  if ((entry.vp ?? 0) !== 0) points.push({ type: 'PointsChanged', player: ctx.player, delta: entry.vp ?? 0 });
  for (const [key, delta] of Object.entries(entry.opponentVp ?? {})) {
    const rival = playerOfKey(ctx.table, key);
    if (rival !== undefined && rival !== ctx.player && delta !== 0) points.push({ type: 'PointsChanged', player: rival, delta });
  }
  emit(ctx, points, { quiet: true });
}

const isPublic = (id: string): boolean => id.startsWith('publicObjective:');
const isSecret = (id: string): boolean => id.startsWith('secretObjective:');
const standing = (units: Record<string, number | undefined>): boolean => Object.values(units).some(count => (count ?? 0) > 0);

/** What an objective's requirement is asked with: the board before the entry, read for the player who scores. */
function requirementContext(ctx: Ctx, entry: StatusEntry, objective: string): RequirementContext {
  const { table, board, pack, player } = ctx;
  const base = contextOf(table, board, pack, player, objective, { actor: player, entry, step: 'status' }, () => undefined);
  const map = mapSource(table, board);
  const planets = (): string[] => Object.keys(board.planets);
  return Object.assign(base, {
    entry, objective, map,
    fleets: () => Object.keys(board.systems).flatMap(slot => (standing(shipsIn(board, slot, player)) ? [{ slot, units: shipsIn(board, slot, player) }] : [])),
    grounds: () => planets().flatMap(planet => (standing(groundOn(board, planet, player)) ? [{ planet, units: groundOn(board, planet, player) }] : [])),
    controller: (planet: string) => board.planets[planet]?.owner,
    others: () => table.players.map(p => p.id).filter(id => id !== player),
    readyPlanets: () => readyPlanets(board, player),
    productionIn: (slot: string) => productionLimit(table, board, pack, player, slot),
    controlledOnBoard: (other: string) => {
      const onBoard = new Set(slotsOf(table, board, pack).flatMap(slot => base.planetsIn(slot)));
      return planetsOf(board, other).filter(planet => onBoard.has(planet)).length;
    },
  });
}

/**
 * Step 81.1, before the entry changes anything: what the objectives it scores must meet. At most one public and one
 * secret one (61.6), none twice by the same player (61.8), a public one only while every planet of the home system is
 * controlled (61.16), and the requirement of each objective's effect (61.5.1, `requirement`).
 */
function checkObjectives(ctx: Ctx, entry: StatusEntry): Warning[] {
  const found: Warning[] = [];
  const scored = (entry.scored ?? []).filter(id => componentById(ctx.pack, id) !== undefined);
  for (const [kind, test] of [['public', isPublic], ['secret', isSecret]] as const) {
    const count = scored.filter(test).length;
    if (count > 1) found.push(violation(objectivesPerPhase.code, { kind, count }, 'status'));
  }
  const mine = ctx.board.players[ctx.player];
  const homeHeld = contextOf(ctx.table, ctx.board, ctx.pack, ctx.player, '', { actor: ctx.player }, () => undefined).home(ctx.player).every(planet => ctx.board.planets[planet]?.owner === ctx.player);
  scored.forEach((id, index) => {
    if (mine?.cards[id]?.state === 'inPlay' || scored.indexOf(id) !== index) found.push(violation(objectiveRepeated.code, { objective: id }, 'status'));
    if (isPublic(id) && !homeHeld) found.push(violation(scoreWithoutHome.code, { objective: id }, 'status'));
    const asks = effectOf(ctx.pack, id)?.requirement;
    const need = asks?.(requirementContext(ctx, entry, id));
    if (need && need.have < need.need) found.push(objectiveNotMet(id, need.have, need.need));
  });
  return found;
}

/** The whole entry of the phase: what the objectives it scores must meet, the tokens and points, the scoring. */
export function statusAction(ctx: Ctx): void {
  const entry = ctx.entry as StatusEntry;
  warn(ctx, checkObjectives(ctx, entry));
  statusTokens(ctx, entry);
  applyScored(ctx, entry.scored);
}
