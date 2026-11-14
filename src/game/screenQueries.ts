/**
 * Questions the plan screen and the big hex ask of the kernel's rounds and boards: the turns of a round with the actions
 * nested in its cards, what the shop may spend, the structure limit of a planet, the merged counts of the hex, who holds
 * each expedition part, and where in the plan the components of a player first appear. Each is pinned against the
 * question of the old model it replaced (`screenQueries.test.ts`).
 */
import { PER_PLANET } from '../domain/replay/structures';
import { violation } from '../domain/rules/registry';
import { upgradesOf } from '../domain/holdings';
import type { MergedCount } from '../domain/losses';
import type { AdjustmentKind, DataPack, UnitCounts, UnitId, Warning } from '../domain/types';
import type { Tactical, Turn } from './actions';
import { mergedTurn } from './edit/merged';
import { legacyKey } from './keys';
import { payingPlanets, planetValue } from './queries';
import type { Round } from './round';
import type { SavedGame } from './save';
import type { Board, PlayerId, Table } from './types';

/** The turns of a round, each followed by the actions nested in it (Warfare's free action): the order the entries of a round had. */
export const allTurns = (round: Round): Turn[] =>
  round.turns.flatMap(turn => [turn, ...(turn.action.kind === 'strategic' ? turn.action.nested ?? [] : [])]);

/** The signed counts of the merged correction of a system and kind: space first, then by planet. */
export function mergedCountsOf(round: Round, kind: AdjustmentKind, systemId: string): MergedCount[] {
  const action = mergedTurn(round, kind, systemId)?.action;
  const delta = action?.kind === 'correction' ? action.delta : undefined;
  const counts = (units: UnitCounts, planetId: string | null): MergedCount[] =>
    (Object.keys(units) as UnitId[]).map(unit => ({ unit, planetId, count: units[unit] ?? 0 }));
  return [
    ...counts(delta?.units?.units ?? {}, null),
    ...Object.entries(delta?.ground ?? {}).flatMap(([planetId, units]) => counts(units, planetId)),
  ];
}

/** What the board itself breaks on these planets, apart from any turn: more PDS on a planet than it holds (63.3, 85.5). */
export function structureWarningsOn(board: Board, planetIds: string[]): Warning[] {
  return planetIds.flatMap(planetId => (board.planets[planetId]?.structures.pds ?? 0) > PER_PLANET.pds
    ? [violation('structureLimit', { kind: 'pds', planetId, count: PER_PLANET.pds, context: 'planet' }, 'production')]
    : []);
}

/** What the player can still spend on resources: the ready planets and planet cards at their worth, and the trade goods held. */
export function spendableOn(table: Table, board: Board, pack: DataPack, player: PlayerId): number {
  return payingPlanets(table, board, pack, player).reduce((sum, id) => sum + planetValue(table, board, pack, player, id, 'resources'), 0)
    + (board.players[player]?.tradeGoods ?? 0);
}

/** Who holds each expedition part: those set at the start, and mine from the expeditions of the plan's turns that stand. */
export function sliceOwnersOf(saved: SavedGame): Record<string, 'me' | 'other'> {
  const owners: Record<string, 'me' | 'other'> = {};
  for (const [id, player] of Object.entries(saved.start.expedition.slices)) if (player) owners[id] = player === saved.table.viewer ? 'me' : 'other';
  const plan = saved.plans.find(p => p.id === saved.activePlanId);
  for (const round of plan?.rounds ?? []) {
    for (const turn of allTurns(round)) {
      if (turn.status === 'cancelled') continue;
      for (const act of turn.acts) if (act.kind === 'expedition' && act.slice) owners[act.slice] = 'me';
    }
  }
  return owners;
}

/**
 * The first round whose turns bring each component, by the owner key of the player (`me` or a rival's id): gains,
 * research and scored objectives; done turns for `now`, planned ones too for `forecast`. What is held from the start is not listed.
 */
export function holdingRoundsOf(table: Table, rounds: Round[], filter: 'now' | 'forecast'): Record<string, Record<string, number>> {
  const found: Record<string, Record<string, number>> = {};
  for (const round of [...rounds].sort((a, b) => a.number - b.number)) {
    for (const turn of allTurns(round)) {
      if (turn.status === 'cancelled' || (filter === 'now' && turn.status !== 'done')) continue;
      const action = turn.action;
      const ids = [
        ...(turn.gains ?? []),
        ...(action.kind === 'strategic' || action.kind === 'secondary' ? action.effects?.researched ?? [] : []),
        ...(action.kind === 'status' ? action.scored ?? [] : []),
      ];
      if (ids.length === 0) continue;
      const mine = (found[legacyKey(table, turn.player)] ??= {});
      for (const id of ids) mine[id] ??= round.number;
    }
  }
  return found;
}

/** The first round whose turns of mine research each unit upgrade: done ones for `now`, planned ones too for `forecast`. */
export function upgradeRoundsOf(table: Table, rounds: Round[], filter: 'now' | 'forecast', pack: DataPack): Record<string, number> {
  const found: Record<string, number> = {};
  for (const [id, round] of Object.entries(holdingRoundsOf(table, rounds, filter).me ?? {})) {
    const [unit] = upgradesOf({ technologies: [id] }, pack);
    if (unit) found[unit] = Math.min(found[unit] ?? round, round);
  }
  return found;
}

/** A turn whose action is a tactical one. */
export type TacticalTurn = Turn & { action: Tactical };
export const isTacticalTurn = (turn: Turn | undefined): turn is TacticalTurn => turn?.action.kind === 'tactical';
