/**
 * The one runner of the hooks written for the kernel (`on` of a component's ability). For a kind of hook it finds the
 * components in force for the players it is asked of (`inForce`, in registry order), keeps those whose `holder`
 * declaration speaks in this action, gives each a context over the board as it stands, applies the events it returns
 * with the component as their cause, and collects the warnings. A later component sees what an earlier one did. The old
 * per-player state is not built here: where a pool warning needs it (tokens gained), it is read from the board once.
 */
import { speaksIn } from '../../domain/effects/holder';
import { effectOf, holderRuleOf } from '../../domain/effects/registry';
import { checkPoolChange } from '../../domain/replay/status';
import { tileAt } from '../../domain/replay/board';
import { researchTechnologies } from '../../domain/replay/research';
import { checkSystem } from '../../domain/replay/transport';
import { adjacentTo, wormholesOf } from '../../domain/movement';
import { commodityValueOf } from '../../domain/replay/cards/trade';
import { violation } from '../../domain/rules/registry';
import { noteBase } from '../../domain/components';
import type { Entry, Warning } from '../../domain/types';
import { readerOf, type Reader } from '../abilities/facade';
import { appliedOn, inForce } from '../abilities/registry';
import { areNeighbours, planetValue, reinforcementsOf } from '../queries';
import { planetsIn } from '../space';
import { homeOf } from '../setup';
import type { AbilityContext, HookKind, HookPayloads } from '../abilities/types';
import { applyAll, applyChecked } from '../apply';
import type { GameEvent } from '../events';
import { legacyEvents, legacyKey, legacyViews, legacyViewsFresh, playerOfKey, viewFor } from '../legacyViews';
import type { Board, DataPack, PlayerId, RuleStep, Table } from '../types';
import { warn, type Ctx } from './context';

export interface HookResult { board: Board; events: GameEvent[]; violations: Warning[] }

export interface HookOptions {
  /** Whose turn or action it is. */
  actor: PlayerId;
  step?: RuleStep;
  /** The turn the moment belongs to; stamped on the events. */
  turn?: string;
  entry?: Entry;
  /** A component held in several copies (notes) is asked once. */
  once?: boolean;
  /** Asks these components (found before the moment, as a planet lost takes a legendary one with it) instead of those in force now. */
  only?: readonly string[];
  /** What the player chose for the component (`choicesFor`). */
  choices?: Readonly<Record<string, string | number>>;
  /** `play` only: whether the component was held and ready when it was played. */
  held?: boolean;
}

/** The pool warnings of tokens just changed: a pool below zero, more than the tokens of a faction, a fleet pool under the ships standing (the checks of the old `gainTokens`). */
function poolWarnings(table: Table, before: Board, board: Board, pack: DataPack, event: Extract<GameEvent, { type: 'TokensChanged' }>, step: RuleStep | undefined): Warning[] {
  const found: Warning[] = [];
  const pools = { tactic: event.delta.tactic ?? 0, fleet: event.delta.fleet ?? 0, strategy: event.delta.strategy ?? 0 };
  for (const pool of ['tactic', 'fleet', 'strategy'] as const) {
    const had = before.players[event.player]?.pools[pool] ?? 0;
    if (pools[pool] < 0 && had + pools[pool] < 0) found.push(violation('poolNegative', { pool, have: had + pools[pool] }, step));
  }
  const v = viewFor(table, board, pack, event.player);
  found.push(...checkPoolChange(v.game, v.state, pack, pools, step, v.shared));
  return found;
}

/** The context a component is asked with: the board as it stands, the holder and the actor, the readers and the questions of the game. */
export function contextOf(
  table: Table, at: Board, pack: DataPack, player: PlayerId, id: string, options: Pick<HookOptions, 'actor' | 'step' | 'choices' | 'entry' | 'held'>, warn: (warning: Warning) => void,
): AbilityContext {
  return {
    board: at, table, pack, holder: player, actor: options.actor, ...(options.step ? { step: options.step } : {}), held: options.held ?? true, choices: options.choices ?? {}, own: player === options.actor,
    get my(): Reader { return readerOf(table, at, pack, player); }, of: other => readerOf(table, at, pack, other),
    key: other => legacyKey(table, other), id, ...(options.entry ? { entry: options.entry } : {}),
    commodityValue: other => { const v = viewFor(table, at, pack, other); return commodityValueOf(v.game, v.state, pack, v.shared); },
    playerOf: key => playerOfKey(table, key),
    home: other => homeOf(table, table.players.find(p => p.id === other)!, pack)?.planets ?? [],
    neighbours: (a, b) => areNeighbours(table, at, pack, a, b),
    applied: (point, base, extra) => appliedOn(table, at, pack, player, point, base, extra).value,
    unitLimit: (units, step) => {
      const left = reinforcementsOf(at, pack, player);
      return (Object.keys(units) as (keyof typeof units)[]).flatMap(unit => {
        const limit = pack.units[unit]?.limit;
        const free = left[unit];
        return limit === null || limit === undefined || free === undefined || (units[unit] ?? 0) <= free ? [] : [violation('reinforcementsOut', { unit, limit, have: limit - free }, step)];
      });
    },
    planetsIn: slot => planetsIn(table, at, pack, slot),
    systemOf: planet => Object.keys({ ...table.map, ...at.common.fracture.tiles }).find(slot => planetsIn(table, at, pack, slot).includes(planet)),
    after: events => contextOf(table, applyAll(at, events), pack, player, id, options, warn),
    research: technology => {
      const before = legacyViews(table, at, pack);
      const work = legacyViewsFresh(table, at, pack);
      const v = viewFor(table, at, pack, player, work);
      const found: Warning[] = [];
      researchTechnologies(v.game, v.state, v.shared, [technology], pack, found);
      found.forEach(warn);
      return legacyEvents(table, pack, before, work, player);
    },
    systemWarnings: slot => { const v = viewFor(table, at, pack, player); return checkSystem(v.game, v.state, slot, pack); },
    planetValue: (planet, kind) => planetValue(table, at, pack, player, planet, kind),
    tileKind: slot => { const v = viewFor(table, at, pack, player); return tileAt(v.game, slot, pack)?.kind; },
    wormholes: slot => { const v = viewFor(table, at, pack, player); return wormholesOf(v.game, pack, slot, v.shared.wormholeTokens); },
    adjacent: slot => { const v = viewFor(table, at, pack, player); return adjacentTo(v.game, slot, pack); },
    warn,
  };
}

/** Asks the components in force of `players` for the hook, in order, and applies what they return. */
export function runHooks<K extends HookKind>(
  table: Table, start: Board, pack: DataPack, kind: K, players: readonly PlayerId[], payload: HookPayloads[K], options: HookOptions,
): HookResult {
  let board = start;
  const events: GameEvent[] = [];
  const violations: Warning[] = [];
  for (const player of players) {
    const asked = new Set<string>();
    const ids = (options.only ?? inForce(table, board, pack, player)).filter(id => {
      const effect = effectOf(pack, id);
      if (effect?.on?.[kind] === undefined || !speaksIn(effect.holder ?? holderRuleOf(pack, id), player === options.actor, false)) return false;
      if (options.once && asked.has(noteBase(id))) return false;
      asked.add(noteBase(id));
      return true;
    });
    for (const id of ids) {
      const hook = effectOf(pack, id)!.on![kind]!;
      const at = board;
      const made: GameEvent[] = [];
      const context = contextOf(table, at, pack, player, id, options, warning => { violations.push(warning); });
      const returned = (hook as (ctx: AbilityContext, payload: HookPayloads[K]) => GameEvent[] | void)(context, payload);
      for (const event of returned ?? []) {
        const step = event.cause?.step ?? options.step;
        const stamped: GameEvent = { ...event, cause: { ...(options.turn ? { turn: options.turn } : {}), ...event.cause, ...(step ? { step } : {}), component: id } };
        const applied = applyChecked(board, stamped);
        if (stamped.type === 'TokensChanged' && event.cause?.step !== undefined) violations.push(...poolWarnings(table, board, applied.board, pack, stamped, event.cause?.step));
        board = applied.board;
        made.push(stamped);
        // A card a `gained` hook gives (the Quantum Core's breakthrough) is gained like any other: what it does when gained runs too.
        if (kind === 'gained' && stamped.type === 'CardGained' && effectOf(pack, stamped.card)?.on?.gained !== undefined) {
          const nested = runHooks(table, board, pack, 'gained', [stamped.player], {}, { ...options, only: [stamped.card], choices: {} });
          board = nested.board;
          made.push(...nested.events);
          violations.push(...nested.violations);
        }
      }
      events.push(...made);
    }
  }
  return { board, events, violations };
}

/** The hook of the turn being resolved: the board, the step's events and the turn's warnings take what the components did. */
export function hook<K extends HookKind>(ctx: Ctx, kind: K, players: readonly PlayerId[], payload: HookPayloads[K], options: Partial<HookOptions> = {}): void {
  const result = runHooks(ctx.table, ctx.board, ctx.pack, kind, players, payload, { actor: ctx.player, step: ctx.cur.step, entry: ctx.entry, ...options });
  if (result.events.length === 0 && result.violations.length === 0) return;
  ctx.board = result.board;
  ctx.cur.events.push(...result.events);
  if (result.violations.length > 0) warn(ctx, result.violations);
}
