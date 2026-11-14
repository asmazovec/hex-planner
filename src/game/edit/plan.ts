/**
 * The edits of a plan, over the kernel's rounds and turns: add, replace, remove and move a turn, its status, the strategy
 * cards of a round, rounds added and removed, and a copy of the rounds under fresh ids. Pure functions `Round -> Round`
 * (and over lists of rounds) that keep every object they do not change, so that no-op edits are detectable by reference
 * and the timeline recomputes only from the round that changed. A strategy card's free action (Warfare) is nested in its
 * card, so a turn is found by its id among the turns of a round and among the actions nested in them.
 */
import type { EntryStatus, Phase } from '../../domain/types';
import type { Strategic, Turn } from '../actions';
import { PHASES, type Round } from '../round';
import type { PlayerId } from '../types';
import { withForTokenOfRound } from './strategic';

const phaseOf = (turn: Turn): Phase => turn.phase ?? 'action';
const nestedOf = (turn: Turn): Turn[] => (turn.action.kind === 'strategic' ? turn.action.nested ?? [] : []);

/** Whether the round holds the turn: among its turns, or nested in one of them. */
export const holdsTurn = (round: Round, id: string): boolean => round.turns.some(t => t.id === id || nestedOf(t).some(n => n.id === id));

/** The turn with this id in a list of rounds, with the round it is in and the card turn it is nested in, if any. */
export function findTurn(rounds: Round[], id: string): { turn: Turn; round: Round; parent?: Turn } | undefined {
  for (const round of rounds) {
    for (const turn of round.turns) {
      if (turn.id === id) return { turn, round };
      const inside = nestedOf(turn).find(n => n.id === id);
      if (inside) return { turn: inside, round, parent: turn };
    }
  }
  return undefined;
}

const withNested = (parent: Turn, nested: Turn[]): Turn =>
  (parent.action.kind === 'strategic' ? { ...parent, action: { ...parent.action, nested } as Strategic } : parent);

const sameTurn = (a: Turn, b: Turn): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

/** Turns in the order of the phases; inside a phase the order they were put in. */
const byPhase = (turns: Turn[]): Turn[] => PHASES.flatMap(phase => turns.filter(t => phaseOf(t) === phase));

/**
 * The turn goes to the end of its phase, or, with `parentId`, into the actions nested in that card turn (it takes the
 * card's status). Its phase is written: the status turn is of the status phase, an agenda correction of the agenda phase.
 */
export function withTurnAdded(round: Round, turn: Turn, parentId?: string): Round {
  if (parentId !== undefined) {
    return { ...round, turns: round.turns.map(t => (t.id === parentId ? withNested(t, [...nestedOf(t), { ...turn, status: t.status }]) : t)) };
  }
  const placed: Turn = { ...turn, phase: turn.phase ?? (turn.action.kind === 'status' ? 'status' : turn.action.kind === 'agenda' ? 'agenda' : 'action') };
  return { ...round, turns: byPhase([...round.turns, placed]) };
}

/** The turn (or the nested action) with this id replaced; the round stays itself when nothing differs. */
export function withTurnReplaced(round: Round, id: string, next: Turn): Round {
  const turns = round.turns.map(turn => {
    if (turn.id === id) return sameTurn(turn, next) ? turn : next;
    const nested = nestedOf(turn);
    if (!nested.some(n => n.id === id)) return turn;
    const changed = nested.map(n => (n.id === id ? (sameTurn(n, next) ? n : next) : n));
    return changed.every((n, i) => n === nested[i]) ? turn : withNested(turn, changed);
  });
  return turns.every((t, i) => t === round.turns[i]) ? round : { ...round, turns };
}

/** The turn goes, and its nested actions with it; a nested action alone leaves its card. */
export function withTurnRemoved(round: Round, id: string): Round {
  if (!holdsTurn(round, id)) return round;
  const turns = round.turns.filter(t => t.id !== id).map(t => {
    const nested = nestedOf(t);
    return nested.some(n => n.id === id) ? withNested(t, nested.filter(n => n.id !== id)) : t;
  });
  return { ...round, turns };
}

/** Turns of one phase keep their relative order; `toIndex` counts within that phase. */
export function withTurnMoved(round: Round, id: string, phase: Phase, toIndex: number): Round {
  const moving = round.turns.find(t => t.id === id);
  if (!moving) return round;
  const rest = round.turns.filter(t => t.id !== id);
  const samePhase = rest.filter(t => phaseOf(t) === phase);
  const index = Math.max(0, Math.min(toIndex, samePhase.length));
  const before = samePhase[index];
  const insertAt = before ? rest.indexOf(before) : rest.length;
  const moved = phaseOf(moving) === phase ? moving : { ...moving, phase };
  const turns = byPhase([...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)]);
  return turns.every((t, i) => t === round.turns[i]) ? round : { ...round, turns };
}

/** The status of a turn; a card's free action has the status of its card. */
export function withTurnStatus(round: Round, id: string, status: EntryStatus): Round {
  const own = round.turns.find(t => t.id === id) ?? round.turns.find(t => nestedOf(t).some(n => n.id === id));
  if (!own) return round;
  const turns = round.turns.map(t => {
    if (t !== own || t.status === status) return t;
    return withNested({ ...t, status }, nestedOf(t).map(n => ({ ...n, status })));
  });
  return turns.every((t, i) => t === round.turns[i]) ? round : { ...round, turns };
}

/** How many cards a player holds at a table of this many: two up to four players. */
const cardsHeld = (playerCount: number): number => (playerCount <= 4 ? 2 : 1);

/** The cards the viewer holds in a round, by its chosen cards. */
export const heldOf = (strategyCard: number | null, backupCard: number | null, playerCount: number): number[] =>
  (cardsHeld(playerCount) > 1 ? [strategyCard, backupCard] : [strategyCard]).filter((card): card is number => card !== null);

/**
 * The round's cards change: backup, then primary, then removed. The cards held and the flag of the viewer's primaries
 * follow (83.3: a primary played for a token is one of a card the viewer does not hold).
 */
export function withCardCycled(round: Round, initiative: number, playerCount: number, viewer: PlayerId): Round {
  const [strategyCard, backupCard] = round.strategyCard === initiative ? [null, round.backupCard]
    : round.backupCard === initiative ? [initiative, null]
      : [round.strategyCard, initiative];
  return withForTokenOfRound({ ...round, strategyCard, backupCard, held: heldOf(strategyCard, backupCard, playerCount) }, viewer);
}

/** A round after the last one, with nothing in it. */
export const withRoundAdded = (rounds: Round[]): Round[] =>
  [...rounds, { number: Math.max(0, ...rounds.map(r => r.number)) + 1, strategyCard: null, backupCard: null, held: [], turns: [] }];

/** A round goes and the later ones close the gap; at least one stays. */
export function withoutRound(rounds: Round[], number: number): Round[] {
  if (rounds.length <= 1 || !rounds.some(r => r.number === number)) return rounds;
  return rounds.filter(r => r.number !== number).map(r => (r.number > number ? { ...r, number: r.number - 1 } : r));
}

/** The rounds as a deep copy under fresh ids, the actions nested in a card included. */
export function copiedRounds(rounds: Round[], newId: () => string): Round[] {
  const fresh = (turn: Turn): Turn => {
    const copy = structuredClone(turn);
    copy.id = newId();
    if (copy.action.kind === 'strategic' && copy.action.nested) copy.action.nested = copy.action.nested.map(fresh);
    return copy;
  };
  return rounds.map(round => ({ ...structuredClone({ ...round, turns: [] }), turns: round.turns.map(fresh) }));
}
