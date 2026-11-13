/**
 * Step 89.4 Invasion: ground forces land on the planets of the active system, the first to land on Mecatol Rex takes
 * the custodians token, and a planet that still holds the active player's ground forces changes hands (the structures
 * of its old owner go with the change, and it comes exhausted: 25.1, 49.5). Structures carried in the flight are put on
 * their planets at the end of the action.
 */
import { CUSTODIANS_COST, MECATOL_PLANETS } from '../../domain/mecatol';
import { isStation } from '../../domain/replay/board';
import { checkLandings } from '../../domain/replay/invasion';
import { checkStationLandings } from '../../domain/thundersEdge';
import { violation } from '../../domain/rules/registry';
import type { StructureKind, UnitCounts } from '../../domain/types';
import type { GameEvent } from '../events';
import { legacyKey } from '../legacyViews';
import { groundOn, ownerOf } from '../queries';
import { planetsIn } from '../space';
import { checkView, emit, warn, type Ctx } from './context';
import { controlHooks } from './legacyEffects';
import { hook } from './hooks';
import { effectOf } from '../../domain/effects/registry';
import { inForce } from '../abilities/registry';
import { tradeGoodsOnControl } from '../queries';
import { checkedPay, checkPay, pay } from './payment';

const PER_PLANET: Record<StructureKind, number> = { spacedock: 1, pds: 2 };
const KINDS: StructureKind[] = ['pds', 'spacedock'];

const groundOf = (units: UnitCounts, ctx: Ctx): UnitCounts =>
  Object.fromEntries(Object.entries(units).filter(([id, n]) => (n ?? 0) > 0 && ctx.pack.units[id as keyof UnitCounts]?.ground)) as UnitCounts;
const some = (units: UnitCounts | undefined): boolean => Object.values(units ?? {}).some(n => (n ?? 0) > 0);

/** The planets of mine the viewer lost to a rival's landing, and the hooks of the viewer's components asked before the loss (the `onControlLost` hook). */
export interface Lost { planets: { planetId: string; to: string }[]; hooked: string[] }

/** What the action did to the planets: which ones got ground forces (they may change hands), which of the viewer's were lost. */
export interface Landed { on: string[]; lost: Lost }

export function landUnits(ctx: Ctx, target: string): Landed {
  const v0 = checkView(ctx);
  warn(ctx, checkStationLandings(ctx.entry as never, ctx.pack));
  warn(ctx, checkLandings(v0.game, v0.state, target, ctx.entry as never, ctx.pack));
  const planets = planetsIn(ctx.table, ctx.board, ctx.pack, target);
  const on: string[] = [];
  for (const landing of ctx.tactical.invasion) {
    if (!planets.includes(landing.planet)) continue;
    const landed = groundOf(landing.units, ctx);
    // What was entered lands: a shortfall is `landingOverLimit` and forbids nothing, the stack it comes from only ends empty.
    emit(ctx, [{ type: 'UnitsRemoved', player: ctx.player, at: landing.from === undefined ? { slot: target } : { planet: landing.from }, units: landed }], { quiet: true });
    if (!some(landed)) continue;
    const custodians = MECATOL_PLANETS.includes(landing.planet) && ownerOf(ctx.board, landing.planet) === undefined && ctx.board.common.custodians;
    if (custodians) {
      // The six influence come from the turn's own payment; one warning says what is lacking.
      const payment = ctx.tactical.custodians ?? { planets: [], tradeGoods: 0 };
      warn(ctx, checkPay(ctx, payment, 'invasion'));
      const paid = pay(ctx, payment, 'influence');
      if (paid < CUSTODIANS_COST) warn(ctx, violation('custodians', { planetId: landing.planet, needed: CUSTODIANS_COST, paid }));
      emit(ctx, [{ type: 'CustodiansRemoved', player: ctx.player }, { type: 'PointsChanged', player: ctx.player, delta: 1 }], { quiet: true });
    }
    hook(ctx, 'onLanding', ctx.table.players.map(p => p.id), { planetId: landing.planet, landed: Object.values(landed).reduce((sum, n) => sum + (n ?? 0), 0) });
    emit(ctx, [{ type: 'UnitsPlaced', player: ctx.player, at: { planet: landing.planet }, units: landed }], { quiet: true });
    if (!on.includes(landing.planet)) on.push(landing.planet);
  }
  return { on, lost: { planets: [], hooked: [] } };
}

/**
 * Each planet landed on that still holds the active player's ground forces is theirs (49.5): the structures of the old
 * owner go with it, it is exhausted, and the components hooked on the gain run. A planet of the viewer's lost to a
 * rival is told to the `onControlLost` hook, once the action is over.
 */
export function gainControl(ctx: Ctx, landed: Landed): void {
  for (const planetId of landed.on) {
    if (!some(groundOf(groundOn(ctx.board, planetId, ctx.player), ctx))) continue;
    if (ctx.board.planets[planetId]?.owner === ctx.player) continue;
    const was = ownerOf(ctx.board, planetId);
    const fromPlayer = was !== undefined;
    // The structures of the old owner go with the change (49.5.1).
    const lost = was === undefined ? [] : KINDS.map(kind => ({ kind, owner: legacyKey(ctx.table, was), count: ctx.board.planets[planetId]?.structures[kind] ?? 0 })).filter(s => s.count > 0);
    const viewerLoses = ctx.board.planets[planetId]?.owner === ctx.table.viewer && ctx.player !== ctx.table.viewer;
    if (viewerLoses && landed.lost.hooked.length === 0) landed.lost.hooked = inForce(ctx.table, ctx.board, ctx.pack, ctx.table.viewer).filter(id => effectOf(ctx.pack, id)?.on?.onControlLost !== undefined);
    emit(ctx, [
      { type: 'PlanetGained', player: ctx.player, planet: planetId },
      { type: 'PlanetExhausted', player: ctx.player, planet: planetId },
    ], { quiet: true });
    controlHooks(ctx, planetId, fromPlayer, lost);
    // What the components of the player add with a planet gained (Scavenge): the rules themselves bring none.
    const goods = tradeGoodsOnControl(ctx.table, ctx.board, ctx.pack, ctx.player, planetId);
    if (goods !== 0) emit(ctx, [{ type: 'TradeGoodsChanged', player: ctx.player, delta: goods }], { quiet: true });
    if (viewerLoses) landed.lost.planets.push({ planetId, to: ctx.table.players.find(p => p.id === ctx.player)?.legacyId ?? ctx.player });
  }
}

/** Being the only player with units in a system gives control of its space stations (space stations 2). */
export function claimStations(ctx: Ctx, target: string): void {
  const here = planetsIn(ctx.table, ctx.board, ctx.pack, target);
  const stations = here.filter(id => isStation(ctx.pack, id));
  if (stations.length === 0) return;
  const others = ctx.table.players.some(p => p.id !== ctx.player && (some(ctx.board.systems[target]?.ships[p.id]) || here.some(id => some(ctx.board.planets[id]?.ground[p.id]))));
  if (others) return;
  const mine = some(ctx.board.systems[target]?.ships[ctx.player]) || here.some(id => some(ctx.board.planets[id]?.ground[ctx.player]));
  if (mine) emit(ctx, stations.map((planet): GameEvent => ({ type: 'PlanetGained', player: ctx.player, planet })), { quiet: true });
}

/**
 * The structures a flight brought are put on planets when the action ends, after its production: only onto a planet of
 * the system the player controls by then, within what a planet holds (85.4, 85.5). What was entered is placed.
 */
export function placeCarried(ctx: Ctx, target: string): void {
  const planets = planetsIn(ctx.table, ctx.board, ctx.pack, target);
  for (const landing of ctx.tactical.invasion) {
    const kinds = KINDS.filter(kind => (landing.structures?.[kind] ?? 0) > 0);
    if (kinds.length === 0) continue;
    if (!planets.includes(landing.planet)) {
      warn(ctx, violation('landingOutsideSystem', { planetId: landing.planet, systemId: target }));
      continue;
    }
    if (ctx.board.planets[landing.planet]?.owner !== ctx.player) warn(ctx, violation('structureNotControlled', { planetId: landing.planet }, 'invasion'));
    for (const kind of kinds) {
      const count = landing.structures?.[kind] ?? 0;
      const standing = ctx.board.planets[landing.planet]?.owner === ctx.player ? ctx.board.planets[landing.planet]?.structures[kind] ?? 0 : 0;
      const afloat = ctx.board.systems[target]?.afloat[ctx.player]?.[kind] ?? 0;
      const got = Math.min(count, afloat);
      if (got < count) warn(ctx, violation('unitsMissing', { where: target, unit: kind, missing: count - got, planetId: landing.planet }, 'invasion'));
      if (standing + count > PER_PLANET[kind]) warn(ctx, violation('structureLimit', { kind, planetId: landing.planet, count: PER_PLANET[kind] }, 'invasion'));
      const events: GameEvent[] = [];
      if (got > 0) events.push({ type: 'StructureRemoved', player: ctx.player, at: { slot: target }, structures: { [kind]: got } });
      // A second dock on a planet stays one; what a planet the player does not hold gets is not counted.
      const room = kind === 'spacedock' ? Math.max(0, 1 - standing) : count;
      if (ctx.board.planets[landing.planet]?.owner === ctx.player && room > 0) {
        events.push({ type: 'StructurePlaced', player: ctx.player, at: { planet: landing.planet }, structures: { [kind]: kind === 'spacedock' ? 1 : count } });
      }
      emit(ctx, events, { quiet: true });
    }
  }
}

export { checkedPay };
