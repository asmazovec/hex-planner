/**
 * The replay of a plan in one pass: rounds in order, each by its phases (LRR 40), each entry by its own steps. Every
 * entry leaves a frame, the board before and after it, so a question about any point of the plan is a lookup and not
 * another replay. A plan that changed is replayed from its first changed round; the rounds before it keep their frames.
 */
import { choicesFor } from '../effects/choices';
import { fire, type Moment } from '../effects/points/moments';
import { effectOf } from '../effects/registry';
import { playedBy, waive } from '../effects/waivers';
import { blockersOf, type Blockers } from '../movement';
import { gameAs } from '../players';
import { noteBase } from '../components';
import { placeIn } from '../rules/registry';
import type { DataPack, Entry, Game, GameState, Plan, Round, Warning } from '../types';
import { applyActs, type ActContext } from './acts';
import { afterEntry } from './afterEntry';
import { applyCard, cardRound } from './cards';
import type { CardRound } from './cards/index';
import { rivalLandings } from './invasion';
import { payPlayedCost } from './payment';
import { checkFlow, isTurn, PHASE_ORDER, roundFlow, type RoundFlow } from './round';
import { applyComponent, applyGains, applyScored, applyUses, readyCards } from './holdings';
import { applyAdjustment, initialState } from './state';
import { applyStatusTokens, checkObjectives, clearBoard } from './status';
import { keepOwnStructures } from './structures';
import { applyTactical } from './tactical';
import { applyComponentProduction } from './production';

/** The hand holds seven action cards (LRR 2.4). */

export type Filter = 'now' | 'forecast';

/** One entry in the replay. The boards are mine with every opponent's in `rivals`; they are never changed afterwards. */
export interface Frame {
  entryId: string;
  before: GameState;
  /** The same board as `before` for an entry the replay passed over. */
  after: GameState;
  /** False for a cancelled entry, and in "now" for one not done: it changed nothing and has no warnings. */
  applied: boolean;
  warnings: Warning[];
}

/** Where a round began, so the replay can start again from it. */
interface RoundMark { round: Round; start: GameState; taken: string[]; to: number; /** Its status phase was replayed, so its cards are readied. */ statusDone: boolean }

export interface Timeline {
  game: Game;
  plan: Plan;
  filter: Filter;
  pack: DataPack;
  /** In the order the replay went: by round, phase, then the plan's list; a free action right after its card. */
  frames: Frame[];
  byEntry: Map<string, Frame>;
  /** The board after the last entry. */
  end: GameState;
  marks: RoundMark[];
  endTaken: string[];
}

function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as T;
  if (value !== null && typeof value === 'object') {
    const copy: Record<string, unknown> = {};
    for (const key in value) copy[key] = clone((value as Record<string, unknown>)[key]);
    return copy as T;
  }
  return value;
}

/** What the replay reads of a game beside its plans. The store keeps every field it did not edit, so identity is enough. */
const OUTSIDE_SETUP = new Set(['plans', 'activePlanId', 'name']);
function sameSetup(a: Game, b: Game): boolean {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!OUTSIDE_SETUP.has(key) && (a as unknown as Record<string, unknown>)[key] !== (b as unknown as Record<string, unknown>)[key]) return false;
  }
  return true;
}

function applyEntry(
  game: Game, state: GameState, shared: GameState, entry: Entry, pack: DataPack, acts: ActContext, cards: CardRound, flow: RoundFlow, blockers: Blockers | undefined,
  withActs: boolean, playerFaction: (player: string) => string | undefined = () => undefined,
): Warning[] {
  const warnings: Warning[] = checkFlow(game, entry, flow, cards.primaries[entry.owner ?? 'me'] ?? [], pack);
  switch (entry.type) {
    case 'tactical':
      applyTactical(game, state, entry, pack, warnings, blockers, shared);
      break;
    case 'strategic':
    case 'secondary':
      applyCard(game, state, entry, pack, cards, warnings);
      break;
    case 'statusTokens':
      // The objectives are asked against the board before the entry (81.1, note 1).
      checkObjectives(game, state, shared, entry, pack, warnings);
      applyStatusTokens(game, state, entry, pack, warnings, shared);
      applyScored(state, shared, entry.scored, pack);
      break;
    case 'adjustment':
      applyAdjustment(state, entry, warnings);
      break;
    case 'component':
      applyComponent(state, entry, pack, warnings, game.faction, acts.states);
      applyComponentProduction(game, state, entry, pack, warnings);
      break;
    case 'pass':
      break;
  }
  // What the entry uses beside its action is played like a component action's own; then each played component does what its effect says.
  applyUses(state, entry, pack, warnings, game.faction, acts.states);
  payPlayedCost(game, state, shared, entry, pack, warnings);
  for (const id of playedBy(entry)) {
    const effect = effectOf(pack, id);
    if (!effect?.play) continue;
    // A play that asked to run in the middle of a tactical action (`playAt`) has run there already.
    if (entry.type === 'tactical' && effect.playAt) continue;
    // An activation or a combat exists only in a tactical action: a card of that window named elsewhere (discarded as a cost) is not played.
    if (effect.playAt) continue;
    const lacking = warnings.some(w => (w.code === 'componentNotHeld' || w.code === 'componentExhausted') && noteBase(String(w.params.id)) === noteBase(id));
    effect.play({
      game, state, shared, entry, id, player: entry.owner ?? 'me', states: acts.states, choices: choicesFor(entry, id), held: !lacking, pack, warnings, cards,
    });
  }
  // What the entry brings and takes beside its own effect: the owner's holdings, and the laws of the whole game.
  applyGains(state, shared, entry, pack, playerFaction);
  afterEntry({ game, state, shared, entry, pack, cards, warnings, states: acts.states });
  // The acts of a turn come after its action: transactions, then the expedition at its end.
  if (withActs) applyActs(game, state, entry, pack, acts, warnings);
  return placeIn(warnings, entry.id);
}

/** An opponent counted like me: what stands on the map for them is where they begin. */
function rivalState(game: Game, view: Game, id: string, pack: DataPack): GameState {
  const pick = (record: Game['enemyUnits']) => Object.fromEntries(Object.entries(record).flatMap(([place, byOwner]) => (byOwner[id] ? [[place, { ...byOwner[id] }]] : [])));
  // The laws, the revealed objectives and the attachments are the whole game's: they stand on my state only.
  const { laws, revealed, attachments, ...own } = initialState(view, pack);
  void laws; void revealed; void attachments;
  const state: GameState = { ...own, faction: view.faction, systems: pick(game.enemyUnits), ground: pick(game.enemyGround) };
  keepOwnStructures(state, false);
  return state;
}

function startOf(game: Game, pack: DataPack): GameState {
  const state = initialState(game, pack);
  state.faction = game.faction;
  keepOwnStructures(state, true);
  if (game.opponents.length > 0) {
    state.rivals = Object.fromEntries(game.opponents.map(o => [o.id, rivalState(game, gameAs(game, o.id), o.id, pack)]));
    state.rivalHolds = {};
  }
  return state;
}

/**
 * Replays the plan. With `previous`, a timeline of the same game setup, filter and data, the leading rounds that are
 * the same objects keep their frames and the replay starts at the first round that is not.
 */
export function timeline(game: Game, plan: Plan, filter: Filter, pack: DataPack, previous?: Timeline): Timeline {
  const rounds = [...plan.rounds].sort((a, b) => a.number - b.number);
  let kept = 0;
  if (previous && previous.filter === filter && previous.pack === pack && sameSetup(previous.game, game)) {
    while (kept < rounds.length && kept < previous.marks.length && previous.marks[kept].round === rounds[kept]) kept += 1;
    if (kept === rounds.length && kept === previous.marks.length) return previous.game === game && previous.plan === plan ? previous : { ...previous, game, plan };
  }
  const marks: RoundMark[] = previous ? previous.marks.slice(0, kept) : [];
  const frames: Frame[] = previous && kept > 0 ? previous.frames.slice(0, marks[kept - 1].to) : [];
  const resume = previous && kept > 0
    ? (kept < previous.marks.length ? previous.marks[kept] : { start: previous.end, taken: previous.endTaken })
    : undefined;

  /** The last board handed out; `dirty` once the working state moved on from it. */
  let last = resume ? resume.start : startOf(game, pack);
  const state = clone(last);
  let dirty = false;
  const snap = (): GameState => {
    if (dirty) last = clone(state);
    dirty = false;
    return last;
  };
  const rivals: Record<string, GameState> = state.rivals ?? {};
  const views = new Map(game.opponents.map(o => [o.id, gameAs(game, o.id)]));
  const everyone = [state, ...Object.values(rivals)];
  const acts: ActContext = { taken: new Set(resume?.taken), states: { me: state, ...rivals } };

  /** The round before had no status phase replayed: its Ready Cards step (81.6) is made up for as the next round begins. */
  let cardsDue = kept > 0 && !marks[kept - 1].statusDone;
  for (const round of rounds.slice(kept)) {
    const mark: RoundMark = { round, start: snap(), taken: [...acts.taken], to: 0, statusDone: false };
    if (cardsDue) readyCards(everyone);
    // The agenda phase ends by readying the planets (LRR 8), so a round begins with them ready and the board clear.
    clearBoard(everyone);
    dirty = true;
    // The status phase clears the board (81.4) and readies the planets (81.6) once, after its tokens are gained, and in any case before the agenda phase.
    let statusDone = false;
    /** The moments of the round the components are told of (points/moments.ts): once each, for me; the warnings they make go to the entry replayed next. */
    let roundStarted = false;
    let statusStarted = false;
    const lead: Warning[] = [];
    const mine = (entry?: Entry): Moment => ({ game, state, shared: state, pack, warnings: lead, states: { me: state, ...rivals }, ...(entry ? { entry } : {}) });
    /** `entry`: the first status entry, which may name what takes the place of the start's effect (Letani Behemoth for Mitosis). */
    const startStatus = (entry?: Entry) => {
      if (statusStarted) return;
      statusStarted = true;
      if (fire('onStatusStart', mine(entry), {}) > 0) dirty = true;
    };
    const finishStatus = () => {
      if (!statusDone) {
        startStatus();
        clearBoard(everyone);
        readyCards(everyone);
        fire('onStatusEnd', mine(), {});
        dirty = true;
      }
      statusDone = true;
    };
    const cards = cardRound(round, game.playerCount, { me: state, ...rivals });
    /** The faction of a player id, for the laws that bind the player elected. */
    const factionOf = (player: string): string | undefined => (player === 'me' ? game.faction : game.opponents.find(o => o.id === player)?.faction);
    /** The components each player played so far this round: a waiver may last to its end. */
    const plays: Record<string, string[]> = {};
    const flow = roundFlow(round);
    /** Warfare's free tactical action is part of its card: it comes right after the card, not where it is stored. */
    const linked = (card: Entry) => round.entries.find(e => e.type === 'tactical' && e.fromCard === card.id);
    /** Replays one entry, `status` being its card's for Warfare's free action. */
    const step = (entry: Entry, phase: string, status = entry.status): void => {
      const skipped = status === 'cancelled' || (filter === 'now' && status !== 'done');
      if (skipped) {
        let before = snap();
        // Seen from the agenda phase, the status phase is over even where no entry of it was replayed.
        if (phase === 'agenda' && !statusDone) {
          before = clone(before);
          clearBoard([before, ...Object.values(before.rivals ?? {})]);
          readyCards([before, ...Object.values(before.rivals ?? {})]);
        }
        frames.push({ entryId: entry.id, before, after: before, applied: false, warnings: [] });
        return;
      }
      if (phase === 'agenda') finishStatus();
      const rival = entry.owner ? rivals[entry.owner] : undefined;
      const view = rival && entry.owner ? views.get(entry.owner)! : game;
      const own = rival ?? state;
      // The moments that come before the entry: the round and the status phase begin, a turn of the action phase begins.
      let ran = 0;
      if (!roundStarted) {
        roundStarted = true;
        ran += fire('onRoundStart', mine(), {});
      }
      if (phase === 'status') startStatus(entry);
      if (phase === 'action' && isTurn(entry, pack)) {
        ran += fire('onTurnStart', { game: view, state: own, shared: state, pack, warnings: lead, player: entry.owner ?? 'me', states: acts.states, entry }, {});
      }
      if (ran > 0) dirty = true;
      const before = snap();
      const index = frames.push({ entryId: entry.id, before, after: before, applied: true, warnings: [] }) - 1;
      // The ships of everyone else as the replay has them now end the routes of this entry's owner (58.3.2).
      const blockers = entry.type === 'tactical' ? blockersOf(game, state, rival ? entry.owner : undefined, pack) : undefined;
      // A card with Warfare's free action plays it before the acts of its turn.
      const free = entry.type === 'strategic' ? linked(entry) : undefined;
      let warnings = applyEntry(view, own, state, entry, pack, acts, cards, flow, blockers, free === undefined, factionOf);
      if (rival && entry.owner && entry.type === 'tactical') rivalLandings(state, entry, entry.owner, pack, game, warnings);
      dirty = true;
      if (entry.type === 'statusTokens') finishStatus();
      if (lead.length > 0) warnings = [...warnings, ...placeIn(lead.splice(0), entry.id)];
      if (free !== undefined) {
        step(free, phase, status);
        const late: Warning[] = [];
        applyActs(view, own, entry, pack, acts, late);
        warnings = [...warnings, ...placeIn(late, entry.id)];
        dirty = true;
      }
      // The one place a component lifts a check: every warning of the entry is asked of the owner's components.
      const owner = entry.owner ?? 'me';
      const after = snap();
      const side = (board: GameState): GameState => (rival ? board.rivals?.[owner] ?? board : board);
      waive(warnings, { pack, game: view, entry, before: side(before), after: side(after), shared: before }, plays[owner]);
      const played = playedBy(entry);
      if (played.length > 0) plays[owner] = [...(plays[owner] ?? []), ...played];
      frames[index] = { entryId: entry.id, before, after, applied: true, warnings };
    };
    for (const phase of PHASE_ORDER) {
      for (const entry of round.entries) {
        if (entry.phase !== phase || (entry.type === 'tactical' && entry.fromCard && round.entries.some(e => e.id === entry.fromCard))) continue;
        step(entry, phase);
      }
    }
    mark.to = frames.length;
    mark.statusDone = statusDone;
    cardsDue = !statusDone;
    marks.push(mark);
  }
  return { game, plan, filter, pack, frames, byEntry: new Map(frames.map(f => [f.entryId, f])), end: snap(), marks, endTaken: [...acts.taken] };
}

/** The warnings of every replayed entry, by entry id. */
export const warningsOf = (line: Timeline): Record<string, Warning[]> =>
  Object.fromEntries(line.frames.filter(f => f.applied).map(f => [f.entryId, f.warnings]));
