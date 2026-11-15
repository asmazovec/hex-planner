/**
 * One question of the kernel: what would this edit of a turn cause. A candidate is an edit the editors make (the active
 * system, a route, one more unit in a flight, a landing or a production, a planet or a trade good in a payment, a
 * component played or used, a strategy card or its side, a value of a component's choice), applied by the same functions
 * the editors call (`src/game/edit/*`). The edited turn is resolved on the board before the turn by the resolver the plan
 * replay uses (`resolveTurn`, the waivers included), and the answer is the standing warnings the turn does not have
 * without the option. No rule is written here: an ability, a technology or a permit counts because the resolve is the same.
 *
 * - Only this turn is resolved; the later turns of the plan are not replayed for a candidate.
 * - A warning a component waives is no warning of a candidate.
 * - A warning is the same one by its code and the things it names (its place and every text parameter); its numbers are
 *   not compared, so a turn that is already short does not make every further option warned.
 * - An option that is counted or toggled (a unit of a flight, a planet of a payment) is compared with the turn without
 *   any of it: once taken beyond a limit it stays warned for as long as taking it holds the warning. For an option not
 *   taken yet this is the turn as it is now.
 * - Nothing here forbids anything: the answer is for the look of a control, never for its `disabled`.
 */
import { effectOf } from '../domain/effects/registry';
import { standing } from '../domain/rules/registry';
import { CARD, withProduction as effectsWithProduction, withStructure as effectsWithStructure } from '../domain/strategy';
import type { CardEffects, StructureKind, UnitCounts, UnitId, Warning } from '../domain/types';
import { fleetSpeed } from '../domain/movement';
import type { TacticalEntry } from '../domain/replay/state';
import type { Payment, Turn } from './actions';
import { playOfOn, startsAsPrimaryOn, withCard, withCardChange, withCardProduction, withCardStructure, withFreshChange } from './edit/strategic';
import { effectsOf, isCardTurn, isPrimary } from './edit/strategicRead';
import {
  tacticalOf, viaOf, withLandedStructure, withLanding, withLandingFrom, withProductionPayment, withRoute, withStructureCount, withSystem, withUnitCount,
  groupOf,
} from './edit/tactical';
import {
  atOf, custodiansFreeOn, pickedFrom, pickedStructures, poolAt, sourceSystemsOn, structuresAt, tileSystemsOn, withCustodiansOn, withCustodiansSet,
  withProductionOn,
} from './edit/tacticalRead';
import { choicesOfTurn, withChoicesOf, withPlayed, withPlayEffects, withPlayPayment, withProducedPayment, withUses, withUsesRepriced } from './edit/turn';
import { routeHintOn } from './flight';
import { autoPayOn } from './planQueries';
import { mapOf, payingPlanets, routeReadsOn, shipsIn } from './queries';
import { resolveTurn } from './resolve';
import type { RoundTrack } from './resolve/track';
import type { Round } from './round';
import { adjacentSlots, blockersOf, planetsIn } from './space';
import { choicesOf } from './abilities/choices';
import type { Board, ComponentId, DataPack, PlanetId, Slot, Table } from './types';

const isStructure = (kind: string): kind is StructureKind => kind === 'pds' || kind === 'spacedock';

/** Which payment of a turn: of its production, of the custodians token, of its card, of the component it plays, of what that component produces, or of the act at an index. */
export type PaymentOf = 'production' | 'custodians' | 'card' | 'play' | 'produced' | { act: number };

/** An edit of a turn, named by the choice it answers. */
export type Candidate =
  /** The active system of a tactical action. */
  | { kind: 'system'; system: Slot }
  /** A source and its way to the active system; `ships` fly it (the fastest ship of the source, when the kernel lists the candidates). */
  | { kind: 'route'; source: Slot; via: Slot[]; ships?: UnitCounts; /** The system a route under way enters with this candidate. */ next?: Slot }
  /** One more unit, or a structure, taken into the flight of a source at a place: the source, a planet of it, a stop of its way. */
  | { kind: 'fly'; source: Slot; from: string; unit: UnitId | StructureKind }
  /** One more unit or structure landed on a planet; `from` a planet it is committed from. */
  | { kind: 'land'; planet: PlanetId; unit: UnitId | StructureKind; from?: PlanetId }
  /** One more unit produced: in the space area (`planet: null`) or on a planet; `system` for a card or a component, which produce in a system of their own. */
  | { kind: 'produce'; unit: UnitId; planet: PlanetId | null; system?: Slot }
  /** One more structure a card or a component builds on a planet. */
  | { kind: 'build'; structure: StructureKind; planet: PlanetId }
  /** A planet that pays. */
  | { kind: 'pay'; of: PaymentOf; planet: PlanetId }
  /** One more trade good that pays. */
  | { kind: 'payGoods'; of: PaymentOf }
  /** The component a component action plays. */
  | { kind: 'play'; component: ComponentId }
  /** A component used beside the action. */
  | { kind: 'use'; component: ComponentId }
  /** The strategy card of a card turn. */
  | { kind: 'card'; card: number }
  /** The primary or the secondary of the turn's card. */
  | { kind: 'side'; primary: boolean }
  /** A value of a choice a component asks. */
  | { kind: 'choice'; component: ComponentId; key: string; value: string | number };

/** A choice point of a turn: the kernel lists its candidates. `among` is what the screen offers where the kernel cannot know it (a search result). */
export type ChoicePoint =
  | { at: 'system' }
  | { at: 'source' }
  /** The next system of a route under way. */
  | { at: 'route'; path: Slot[] }
  | { at: 'flight'; source: Slot }
  | { at: 'landing' }
  | { at: 'production'; system?: Slot }
  | { at: 'payment'; of: PaymentOf }
  | { at: 'play'; among: readonly ComponentId[] }
  | { at: 'use'; among: readonly ComponentId[] }
  | { at: 'card' }
  | { at: 'side' }
  | { at: 'choice'; component: ComponentId; key: string };

/** A turn at its place in the plan: what a candidate is applied to and resolved on. */
export interface Point {
  table: Table;
  pack: DataPack;
  /** The board just before the turn: the edits read it (prices, automatic payments) and the turn is resolved on it. */
  board: Board;
  turn: Turn;
  /** The card turn the turn is nested in (Warfare's free action): the card is resolved with it, on `hostBoard`, and the warnings placed on the turn are its own. */
  host?: Turn;
  hostBoard?: Board;
  /** The round of the turn: the cards its player holds decide how a card is played. */
  round?: Round;
  /** What the round remembered when the turn began, and what the moments before it warned of. */
  track?: RoundTrack;
  lead?: readonly Warning[];
  /** The payment was chosen by hand: a new price does not pay anew. */
  manual?: boolean;
}

/** A candidate with what it would cause: clean when `adds` is empty. */
export interface Option<C extends Candidate = Candidate> { candidate: C; adds: Warning[] }

// ---------------------------------------------------------------------------------------------------------------------
// The payments of a turn.

const NONE: Payment = { planets: [], tradeGoods: 0 };

function paymentOf(turn: Turn, of: PaymentOf): Payment {
  const action = turn.action;
  if (typeof of === 'object') { const act = turn.acts[of.act]; return act?.kind === 'expedition' ? act.payment : NONE; }
  switch (of) {
    case 'production': return action.kind === 'tactical' ? action.production?.payment ?? NONE : NONE;
    case 'custodians': return action.kind === 'tactical' ? action.custodians ?? NONE : NONE;
    case 'card': return effectsOf(turn).payment ?? NONE;
    case 'play': return action.kind === 'component' ? action.payment ?? NONE : NONE;
    case 'produced': return action.kind === 'component' ? action.effects?.payment ?? NONE : NONE;
  }
}

function withPayment(turn: Turn, of: PaymentOf, payment: Payment): Turn {
  if (typeof of === 'object') return { ...turn, acts: turn.acts.map((act, i) => (i === of.act && act.kind === 'expedition' ? { ...act, payment } : act)) };
  switch (of) {
    case 'production': return withProductionPayment(turn, payment);
    case 'custodians': return withCustodiansSet(turn, payment);
    case 'card': return withCard(turn, { effects: { ...effectsOf(turn), payment } });
    case 'play': return withPlayPayment(turn, payment);
    case 'produced': return turn.action.kind === 'component' ? withPlayEffects(turn, { ...turn.action.effects, payment }) : turn;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The edit of a candidate, and the turn without the option.

const landedOn = (turn: Turn, planet: PlanetId, unit: UnitId): number =>
  tacticalOf(turn).invasion.find(l => l.planet === planet && l.from === undefined)?.units[unit] ?? 0;
const structureOn = (turn: Turn, planet: PlanetId, kind: StructureKind): number =>
  tacticalOf(turn).invasion.find(l => l.planet === planet && l.from === undefined)?.structures?.[kind] ?? 0;
const landedFromOf = (turn: Turn, planet: PlanetId, from: PlanetId, unit: UnitId): number =>
  tacticalOf(turn).invasion.find(l => l.planet === planet && l.from === from)?.units[unit] ?? 0;

/** The effects of a card or a component turn that produce and build. */
const producingEffects = (turn: Turn): CardEffects => (turn.action.kind === 'component' ? turn.action.effects ?? {} : effectsOf(turn));

/** How many of a unit the turn produces at the row of a candidate. */
function producedAt(turn: Turn, c: Extract<Candidate, { kind: 'produce' }>, ground: boolean): number {
  const build = turn.action.kind === 'tactical' ? turn.action.production : producingEffects(turn).production;
  if (!build) return 0;
  if (turn.action.kind !== 'tactical' && c.system !== undefined && (build as { systemId?: string }).systemId !== c.system) return 0;
  return c.planet !== null && ground ? build.ground?.[c.planet]?.[c.unit] ?? 0 : (build.units[c.unit] ?? 0) - (ground ? Object.values(build.ground ?? {}).reduce((sum, units) => sum + (units[c.unit] ?? 0), 0) : 0);
}

/** One step of a production: one more, or one taken back, with the price and the payment that follow as the editor makes them. */
function produceStep(point: Point, turn: Turn, c: Extract<Candidate, { kind: 'produce' }>, amount: 1 | -1): Turn {
  const { table, board, pack } = point;
  const manual = point.manual ?? false;
  if (turn.action.kind === 'tactical') return withProductionOn(table, board, pack, turn, c.unit, c.planet, amount, manual);
  const system = c.system ?? producingEffects(turn).production?.systemId ?? '';
  if (turn.action.kind === 'component') return withProducedPayment(table, board, pack, turn, effectsWithProduction(turn.action.effects ?? {}, system, c.unit, c.planet, amount), manual);
  if (isCardTurn(turn)) return withCardChange(table, board, pack, turn, { effects: effectsOf(withCardProduction(turn, system, c.unit, c.planet, amount)) }, manual);
  return turn;
}

function buildStep(point: Point, turn: Turn, c: Extract<Candidate, { kind: 'build' }>, amount: 1 | -1): Turn {
  const { table, board, pack } = point;
  const manual = point.manual ?? false;
  if (turn.action.kind === 'component') return withProducedPayment(table, board, pack, turn, effectsWithStructure(turn.action.effects ?? {}, c.structure, c.planet, amount), manual);
  if (isCardTurn(turn)) return withCardChange(table, board, pack, turn, { effects: effectsOf(withCardStructure(turn, c.structure, c.planet, amount)) }, manual);
  return turn;
}

const builtOn = (turn: Turn, c: Extract<Candidate, { kind: 'build' }>): number =>
  (producingEffects(turn).structures ?? []).filter(s => s.kind === c.structure && s.planetId === c.planet).length;

/** The turn after the edit of a candidate, as the editor of its choice point writes it. */
export function editedBy(point: Point, c: Candidate): Turn {
  const { table, board, pack, turn } = point;
  const at = atOf(table, board, pack);
  const manual = point.manual ?? false;
  switch (c.kind) {
    case 'system': return withSystem(turn, c.system);
    case 'route': {
      let next = withRoute(at, turn, c.source, c.via);
      const group = groupOf(at, tacticalOf(next).movement, c.source);
      for (const unit of Object.keys(c.ships ?? {}) as UnitId[]) {
        // The ships that fly the way are those the source already sends, or else the ones named.
        if (pickedFrom(group, c.source, unit) === 0) next = withUnitCount(at, next, c.source, c.source, unit, c.ships?.[unit] ?? 0);
      }
      return next;
    }
    case 'fly': {
      const group = groupOf(at, tacticalOf(turn).movement, c.source);
      return isStructure(c.unit)
        ? withStructureCount(at, turn, c.source, c.from, c.unit, pickedStructures(group, c.from, c.unit) + 1)
        : withUnitCount(at, turn, c.source, c.from, c.unit, pickedFrom(group, c.from, c.unit) + 1);
    }
    case 'land': {
      if (isStructure(c.unit)) return withLandedStructure(turn, c.planet, c.unit, structureOn(turn, c.planet, c.unit) + 1);
      if (c.from !== undefined) return withLandingFrom(turn, c.planet, c.from, c.unit, landedFromOf(turn, c.planet, c.from, c.unit) + 1);
      return withCustodiansOn(table, board, pack, withLanding(turn, c.planet, c.unit, landedOn(turn, c.planet, c.unit) + 1), custodiansFreeOn(table, board, pack, turn.player));
    }
    case 'produce': return produceStep(point, turn, c, 1);
    case 'build': return buildStep(point, turn, c, 1);
    case 'pay': {
      const payment = paymentOf(turn, c.of);
      return payment.planets.includes(c.planet) ? turn : withPayment(turn, c.of, { ...payment, planets: [...payment.planets, c.planet] });
    }
    case 'payGoods': {
      const payment = paymentOf(turn, c.of);
      return withPayment(turn, c.of, { ...payment, tradeGoods: payment.tradeGoods + 1 });
    }
    case 'play': {
      const played = withPlayed(turn, c.component);
      const cost = effectOf(pack, c.component)?.cost;
      return cost ? withPlayPayment(played, autoPayOn(table, board, pack, turn.player, cost.amount, cost.kind)) : played;
    }
    case 'use': {
      const list = turn.used.map(u => u.component);
      return list.includes(c.component) ? turn : withUsesRepriced(table, board, pack, turn, withUses(turn, [...list, c.component]), manual);
    }
    case 'card': {
      if (!isCardTurn(turn) || !point.round || turn.action.card === c.card) return turn;
      const play = { card: c.card, ...playOfOn(point.round, turn.player, c.card, startsAsPrimaryOn(point.round, c.card, turn)) };
      return withFreshChange(table, board, pack, turn, play, manual);
    }
    case 'side': {
      if (!isCardTurn(turn) || !point.round || turn.action.card === undefined || isPrimary(turn) === c.primary) return turn;
      return withFreshChange(table, board, pack, turn, playOfOn(point.round, turn.player, turn.action.card, c.primary), manual);
    }
    case 'choice': return withChoicesOf(turn, c.component, { ...choicesOfTurn(turn, c.component), [c.key]: c.value });
  }
}

/** The turn without the option of a candidate: what a counted or toggled option is compared with. The turn itself for an option that is not in it. */
export function withoutOption(point: Point, c: Candidate): Turn {
  const { table, board, pack, turn } = point;
  const at = atOf(table, board, pack);
  switch (c.kind) {
    case 'fly': {
      const group = groupOf(at, tacticalOf(turn).movement, c.source);
      if (isStructure(c.unit)) return pickedStructures(group, c.from, c.unit) > 0 ? withStructureCount(at, turn, c.source, c.from, c.unit, 0) : turn;
      return pickedFrom(group, c.from, c.unit) > 0 ? withUnitCount(at, turn, c.source, c.from, c.unit, 0) : turn;
    }
    case 'land': {
      if (isStructure(c.unit)) return structureOn(turn, c.planet, c.unit) > 0 ? withLandedStructure(turn, c.planet, c.unit, 0) : turn;
      if (c.from !== undefined) return landedFromOf(turn, c.planet, c.from, c.unit) > 0 ? withLandingFrom(turn, c.planet, c.from, c.unit, 0) : turn;
      return landedOn(turn, c.planet, c.unit) > 0
        ? withCustodiansOn(table, board, pack, withLanding(turn, c.planet, c.unit, 0), custodiansFreeOn(table, board, pack, turn.player)) : turn;
    }
    case 'produce': {
      let next = turn;
      const ground = Boolean(pack.units[c.unit]?.ground);
      for (let left = producedAt(turn, c, ground); left > 0; left -= 1) next = produceStep(point, next, c, -1);
      return next;
    }
    case 'build': {
      let next = turn;
      for (let left = builtOn(turn, c); left > 0; left -= 1) next = buildStep(point, next, c, -1);
      return next;
    }
    case 'pay': {
      const payment = paymentOf(turn, c.of);
      return payment.planets.includes(c.planet) ? withPayment(turn, c.of, { ...payment, planets: payment.planets.filter(id => id !== c.planet) }) : turn;
    }
    case 'payGoods': {
      const payment = paymentOf(turn, c.of);
      return payment.tradeGoods > 0 ? withPayment(turn, c.of, { ...payment, tradeGoods: 0 }) : turn;
    }
    case 'use': {
      const list = turn.used.map(u => u.component);
      return list.includes(c.component) ? withUses(turn, list.filter(id => id !== c.component)) : turn;
    }
    default: return turn;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The question.

/** The standing warnings of each turn already resolved at a point: the turn as it is answers for every candidate. */
const resolved = new WeakMap<Point, WeakMap<Turn, Warning[]>>();

/** What a turn breaks at a point, as the plan replay would say of it: the standing warnings, a nested action's own among its card's. */
export function standingAt(point: Point, turn: Turn): Warning[] {
  let known = resolved.get(point);
  if (!known) resolved.set(point, known = new WeakMap());
  const found = known.get(turn);
  if (found) return found;
  const { table, pack, host } = point;
  const options = { ...(point.track ? { track: point.track } : {}), ...(point.lead ? { moments: point.lead } : {}) };
  let warnings: Warning[];
  if (host && host.action.kind === 'strategic') {
    const card: Turn = { ...host, action: { ...host.action, nested: (host.action.nested ?? []).map(inner => (inner.id === turn.id ? turn : inner)) } };
    warnings = resolveTurn(table, point.hostBoard ?? point.board, card, pack, options).steps.flatMap(s => s.violations).filter(w => w.place?.entryId === turn.id);
  } else {
    // A new tactical action has no system yet: nothing of it is resolved.
    const asked = turn.action.kind === 'tactical' && turn.action.system === '' ? { ...turn, action: { ...turn.action, system: null } } : turn;
    warnings = resolveTurn(table, point.board, asked, pack, options).steps.flatMap(s => s.violations);
  }
  const still = standing(warnings);
  known.set(turn, still);
  return still;
}

/** What makes two warnings the same one: the code and everything it names (its place, each text parameter). Numbers are measures and are not compared. */
export function sameAs(warning: Warning): string {
  const named = Object.keys(warning.params).filter(key => typeof warning.params[key] === 'string').sort().map(key => `${key}=${warning.params[key]}`);
  return `${warning.code}|${named.join('|')}`;
}

/** The standing warnings `next` has that `base` has not. */
export function addedBy(point: Point, base: Turn, next: Turn): Warning[] {
  if (base === next) return [];
  const had = new Set(standingAt(point, base).map(sameAs));
  return standingAt(point, next).filter(w => !had.has(sameAs(w)));
}

/** What a candidate would cause: the standing warnings of the turn with it that the turn without the option has not. Empty: the candidate is clean. */
export function causes(point: Point, candidate: Candidate): Warning[] {
  return addedBy(point, withoutOption(point, candidate), editedBy(point, candidate));
}

/** Each candidate with what it would cause. */
export const optionsOf = <C extends Candidate>(point: Point, candidates: readonly C[]): Option<C>[] =>
  candidates.map(candidate => ({ candidate, adds: causes(point, candidate) }));

/** The candidates that lead to no warning. */
export const cleanOf = <C extends Candidate>(options: readonly Option<C>[]): C[] => options.filter(o => o.adds.length === 0).map(o => o.candidate);

// ---------------------------------------------------------------------------------------------------------------------
// The candidates of a choice point.

/** The fastest ship that stands in a system, one of it: the ship a route is asked of. None where no ship flies by itself. */
export function fastestShip(point: Point, source: Slot): UnitCounts {
  const { table, board, pack, turn } = point;
  const group = shipsIn(board, source, turn.player);
  const map = mapOf(table, board, turn.player);
  const reads = routeReadsOn(table, board, pack, turn.player, { systemId: tacticalOf(turn).system, moves: [] } as unknown as TacticalEntry);
  let best: { unit: UnitId; speed: number } | undefined;
  for (const unit of Object.keys(group) as UnitId[]) {
    if ((group[unit] ?? 0) <= 0) continue;
    const speed = fleetSpeed(map, { [unit]: 1 }, reads.holder, pack, reads.view({ from: source, units: group }, undefined));
    if (speed !== null && (!best || speed > best.speed)) best = { unit, speed };
  }
  return best ? { [best.unit]: 1 } : {};
}

/** A route of a path under way: its source, and the way after it up to the active system. */
function routeOf(point: Point, path: Slot[], ships: UnitCounts = fastestShip(point, path[0])): Extract<Candidate, { kind: 'route' }> {
  const active = tacticalOf(point.turn).system;
  const via = path.slice(1).filter(slot => slot !== active);
  return { kind: 'route', source: path[0], via, ships, next: path.at(-1)! };
}

/** The system a candidate of the map stands for: the active system it names, the source of a route, or the system a route under way enters next. */
export const slotOfCandidate = (c: Candidate): Slot | undefined => (c.kind === 'system' ? c.system : c.kind === 'route' ? c.next ?? c.source : undefined);

/** The candidates of a choice point, as the kernel can list them. */
export function candidatesAt(point: Point, where: ChoicePoint): Candidate[] {
  const { table, board, pack, turn } = point;
  const player = turn.player;
  const action = tacticalOf(turn);
  const at = atOf(table, board, pack);
  switch (where.at) {
    case 'system': return tileSystemsOn(table, board, pack).map(system => ({ kind: 'system', system }));
    case 'source':
      return sourceSystemsOn(table, board, pack, player).filter(slot => slot !== action.system).map(slot => routeOf(point, [slot]));
    case 'route': {
      const last = where.path.at(-1);
      if (last === undefined) return [];
      const hint = routeHintOn(table, board, pack, player, where.path, action.system, () => blockersOf(table, board, player, pack));
      const next = new Set([...adjacentSlots(table, board, last, pack), ...hint.reach]);
      for (const slot of where.path) if (slot !== action.system) next.delete(slot);
      const ships = fastestShip(point, where.path[0]);
      return [...next].map(slot => routeOf(point, [...where.path, slot], ships));
    }
    case 'flight': {
      const { source } = where;
      const found: Candidate[] = [];
      const group = groupOf(at, action.movement, source);
      for (const slot of [source, ...viaOf(action, source)]) {
        for (const from of [slot, ...planetsIn(table, board, pack, slot)]) {
          const standingHere = poolAt(board, pack, player, from);
          const units = new Set([...(Object.keys(standingHere) as UnitId[]).filter(u => (standingHere[u] ?? 0) > 0), ...group.filter(f => ('planet' in f.from ? f.from.planet : f.from.slot) === from).flatMap(f => Object.keys(f.units) as UnitId[])]);
          for (const unit of units) {
            // Ships fly from their source alone; on the way only what rides on board is taken.
            if (slot !== source && !pack.units[unit]?.ground && !pack.units[unit]?.fighter) continue;
            found.push({ kind: 'fly', source, from, unit });
          }
          for (const kind of ['pds', 'spacedock'] as StructureKind[]) if (structuresAt(board, pack, player, from, kind) > 0) found.push({ kind: 'fly', source, from, unit: kind });
        }
      }
      return found;
    }
    case 'landing': {
      if (action.system === null) return [];
      const arrived: UnitCounts = { ...shipsIn(board, action.system, player) };
      for (const flight of action.movement) for (const unit of Object.keys(flight.units) as UnitId[]) arrived[unit] = (arrived[unit] ?? 0) + (flight.units[unit] ?? 0);
      const ground = (Object.keys(arrived) as UnitId[]).filter(unit => pack.units[unit]?.ground && (arrived[unit] ?? 0) > 0);
      return planetsIn(table, board, pack, action.system).flatMap(planet => ground.map(unit => ({ kind: 'land' as const, planet, unit })));
    }
    case 'production': {
      const system = where.system ?? (turn.action.kind === 'tactical' ? action.system : producingEffects(turn).production?.systemId) ?? null;
      if (system === null) return [];
      const planets = planetsIn(table, board, pack, system);
      const own = turn.action.kind === 'tactical' ? {} : { system };
      return (Object.keys(pack.units) as UnitId[]).flatMap((unit): Candidate[] => (pack.units[unit]?.ground && planets.length > 0
        ? planets.map(planet => ({ kind: 'produce', unit, planet, ...own }))
        : [{ kind: 'produce', unit, planet: null, ...own }]));
    }
    case 'payment': {
      const paid = paymentOf(turn, where.of).planets;
      return [
        ...[...new Set([...payingPlanets(table, board, pack, player), ...paid])].map((planet): Candidate => ({ kind: 'pay', of: where.of, planet })),
        { kind: 'payGoods', of: where.of },
      ];
    }
    case 'play': return where.among.map(component => ({ kind: 'play', component }));
    case 'use': return where.among.map(component => ({ kind: 'use', component }));
    case 'card': return Object.values(CARD).map(card => ({ kind: 'card', card }));
    case 'side': return [{ kind: 'side', primary: true }, { kind: 'side', primary: false }];
    case 'choice': {
      const asked = choicesOf(table, board, turn, where.component, pack).find(each => each.spec.key === where.key);
      return (asked?.options ?? []).map(value => ({ kind: 'choice', component: where.component, key: where.key, value }));
    }
  }
}

/** The options of a choice point: every candidate the kernel lists for it, clean or with the warnings it would add. */
export const optionsAt = (point: Point, where: ChoicePoint): Option[] => optionsOf(point, candidatesAt(point, where));

/** A key of a candidate, for a screen that keeps the answers of a render. */
export const candidateKey = (c: Candidate): string => JSON.stringify(c);

/** A reader of a point that asks each candidate once: for the blocks of a screen, which ask as they draw. */
export function asker(point: Point): (candidate: Candidate) => Warning[] {
  const kept = new Map<string, Warning[]>();
  return candidate => {
    const key = candidateKey(candidate);
    let found = kept.get(key);
    if (!found) kept.set(key, found = causes(point, candidate));
    return found;
  };
}
