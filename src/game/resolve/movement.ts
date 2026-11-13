/**
 * Step 89.2 Movement: the routes and pickups are checked over the board before the move, then the units (and the
 * structures taken on board) are carried into the active system. What was entered flies: a unit the source does not
 * hold is reported (`unitsMissing`) and arrives all the same, its source only ends empty.
 */
import { checkEntryRoutes } from '../../domain/replay/movement';
import { sourceSlot } from '../../domain/replay/board';
import { checkPickups, overflowLeft } from '../../domain/replay/transport';
import structureAboard from '../../domain/rules/codes/structureAboard';
import { violation } from '../../domain/rules/registry';
import type { StructureKind, UnitCounts } from '../../domain/types';
import type { Flight } from '../actions';
import type { GameEvent } from '../events';
import { viewFor } from '../legacyViews';
import { begin, checkView, emit, warn, type Ctx } from './context';

const KINDS: StructureKind[] = ['pds', 'spacedock'];

/** What the flights left behind, and what each source sent: the transport step checks both. */
export interface Flown { over: Map<string, number>; groups: Record<string, UnitCounts> }

const add = (target: Record<string, UnitCounts>, key: string, units: UnitCounts): void => {
  const bucket = (target[key] ??= {});
  for (const id of Object.keys(units) as (keyof UnitCounts)[]) bucket[id] = (bucket[id] ?? 0) + (units[id] ?? 0);
};

function carryStructures(ctx: Ctx, target: string, flights: Flight[]): void {
  const v = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player);
  for (const flight of flights) {
    const onPlanet = 'planet' in flight.from;
    const from = 'planet' in flight.from ? flight.from.planet : flight.from.slot;
    const source = flight.pickupOf ?? sourceSlot(v.game, ctx.pack, from) ?? from;
    for (const kind of KINDS.filter(k => (flight.structures?.[k] ?? 0) > 0)) {
      const count = flight.structures?.[kind] ?? 0;
      warn(ctx, violation(structureAboard.code, { from: source, ...(onPlanet ? { planetId: from } : {}), unit: kind, count }));
      const short = emit(ctx, [{ type: 'StructureMoved', player: ctx.player, from: flight.from, to: { slot: target }, structures: { [kind]: count } }], { step: 'transport' });
      // What was entered is carried all the same.
      const missing = short.filter(s => s.key === kind).reduce((sum, s) => sum + s.missing, 0);
      if (missing > 0) emit(ctx, [{ type: 'StructurePlaced', player: ctx.player, at: { slot: target }, structures: { [kind]: missing } }], { quiet: true });
    }
  }
}

export function movement(ctx: Ctx, target: string): Flown {
  begin(ctx, 'movement');
  const flights = ctx.tactical.movement;
  const v = checkView(ctx);
  warn(ctx, checkEntryRoutes(v.game, v.state, v.shared, ctx.entry as never, ctx.pack, ctx.blockers));
  warn(ctx, checkPickups(v.game, v.state, target, (ctx.entry as never as { moves: never }).moves, ctx.pack, ctx.blockers));
  const over = overflowLeft(v.game, v.state, target, (ctx.entry as never as { moves: never }).moves, ctx.pack);
  const groups: Record<string, UnitCounts> = {};
  for (const flight of flights) {
    const events: GameEvent[] = [{ type: 'UnitsMoved', player: ctx.player, from: flight.from, to: { slot: target }, units: flight.units }];
    const short = emit(ctx, events);
    // What was entered flies: the part the source did not hold is placed in the target.
    const lacking: UnitCounts = {};
    for (const s of short) if (s.what === 'units') lacking[s.key as keyof UnitCounts] = (lacking[s.key as keyof UnitCounts] ?? 0) + s.missing;
    if (Object.keys(lacking).length > 0) emit(ctx, [{ type: 'UnitsPlaced', player: ctx.player, at: { slot: target }, units: lacking }], { quiet: true });
    const from = 'planet' in flight.from ? flight.from.planet : flight.from.slot;
    const slot = flight.pickupOf ?? sourceSlot(v.game, ctx.pack, from);
    if (slot !== null && slot !== target) add(groups, slot, flight.units);
  }
  carryStructures(ctx, target, flights);
  return { over, groups };
}
