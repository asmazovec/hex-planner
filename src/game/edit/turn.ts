/**
 * The edits of the turns that are not tactical or a strategy card, over `Turn`: the component a turn plays, its note,
 * choices and payment; what it gains, spends and uses; the acts (transactions and the expedition); the numbers of a
 * correction or an agenda; the tokens, points and objectives of the status phase. Pure functions `Turn -> Turn` (a turn
 * of another kind comes back as it is); each is tested against what the screens wrote into the old entry.
 */
import type { AdjustmentDelta, CardEffects, StatusSpend } from '../../domain/types';
import type { Expedition, Payment, Transaction, Turn } from '../actions';
import { withCard } from './strategic';
import { cardCostOn, effectsOf, isCardTurn } from './strategicRead';
import { withProductionPayment } from './tactical';
import { autoPayOn, playedCostOf, productionDueOnBoard } from '../planQueries';
import type { Board, ComponentId, DataPack, PlayerId, Table } from '../types';

type Chosen = Record<string, string | number>;

const withoutKey = <T extends object>(value: T, key: keyof T): T => {
  const next = { ...value };
  delete next[key];
  return next;
};

/** A component action with its fields changed; a turn of another kind is returned as it is. */
function onComponent(turn: Turn, change: (action: Extract<Turn['action'], { kind: 'component' }>) => Extract<Turn['action'], { kind: 'component' }>): Turn {
  return turn.action.kind === 'component' ? { ...turn, action: change(turn.action) } : turn;
}

/** The note of a component action. */
export const withNote = (turn: Turn, note: string): Turn => onComponent(turn, action => ({ ...action, note }));

/** The component a component action plays; none takes it off. What was chosen for the old one goes. */
export function withPlayed(turn: Turn, id: ComponentId | undefined): Turn {
  if (turn.action.kind !== 'component') return turn;
  const { choices, ...rest } = turn;
  void choices;
  const action = id === undefined ? withoutKey(turn.action, 'component') : { ...turn.action, component: id };
  return { ...rest, action };
}

/** What a component action is paid with. */
export const withPlayPayment = (turn: Turn, payment: Payment): Turn => onComponent(turn, action => ({ ...action, payment }));

/** The effects of a component action (its production and the payment of it); none clears them. */
export const withPlayEffects = (turn: Turn, effects: CardEffects | undefined): Turn =>
  onComponent(turn, action => (effects === undefined ? withoutKey(action, 'effects') : { ...action, effects }));

/** What the component action pays for the units it produces, anew for them unless the player chose the planets. */
export function withProducedPayment(table: Table, board: Board, pack: DataPack, turn: Turn, effects: CardEffects | undefined, manual: boolean): Turn {
  if (!effects?.production || manual) return withPlayEffects(turn, effects);
  const due = productionDueOnBoard(table, board, pack, turn.player, effects.production.units, withPlayEffects(turn, effects));
  return withPlayEffects(turn, { ...effects, payment: autoPayOn(table, board, pack, turn.player, due, 'resources') });
}

const listed = (turn: Turn, side: 'gains' | 'spends', ids: ComponentId[]): Turn =>
  (ids.length > 0 ? { ...turn, [side]: ids } : withoutKey(turn, side));

/** What the turn takes (`gains`) or discards (`spends`); the key goes with an empty list. */
export const withListed = listed;

/** The components a turn uses beside its action: what was chosen for one no longer used goes with it. */
export const withUses = (turn: Turn, ids: ComponentId[]): Turn =>
  ({ ...turn, used: ids.map(component => turn.used.find(u => u.component === component) ?? { component }) });

/** What was chosen for a component the turn plays (`choices`) or uses (its entry in `used`); empty choices are dropped. */
export function withChoicesOf(turn: Turn, id: ComponentId, chosen: Chosen): Turn {
  const empty = Object.keys(chosen).length === 0;
  if (turn.action.kind === 'component' && turn.action.component === id) return empty ? withoutKey(turn, 'choices') : { ...turn, choices: chosen };
  const used = turn.used.map(u => (u.component === id ? (empty ? { component: id } : { component: id, choices: chosen }) : u));
  return { ...turn, used };
}

/** The choices a turn made for one component, as the effect sees them: those of the component action, then those of its own use. */
export function choicesOfTurn(turn: Turn, id: ComponentId): Chosen {
  const own = turn.action.kind === 'component' ? turn.action.component : undefined;
  const flat = own === id || own === undefined ? turn.choices : undefined;
  return { ...flat, ...turn.used.find(u => u.component === id)?.choices };
}

/**
 * The turn after a change of what it uses, repriced as the replay prices it: unless the player chose the planets, a new
 * price pays anew from the ready planets. A component action, a tactical action's production and a card's purchases are
 * repriced; any other turn keeps its edit. `board` is the board just before the turn.
 */
export function withUsesRepriced(table: Table, board: Board, pack: DataPack, turn: Turn, next: Turn, manual: boolean): Turn {
  if (manual) return next;
  const pay = (cost: { amount: number; kind: 'resources' | 'influence' }) => autoPayOn(table, board, pack, turn.player, cost.amount, cost.kind);
  if (turn.action.kind === 'component' && next.action.kind === 'component') {
    const was = playedCostOf(table, pack, turn);
    const cost = playedCostOf(table, pack, next);
    return (was?.amount === cost?.amount && was?.kind === cost?.kind) || !cost ? next : withPlayPayment(next, pay(cost));
  }
  if (turn.action.kind === 'tactical' && next.action.kind === 'tactical') {
    const was = productionDueOnBoard(table, board, pack, turn.player, turn.action.production?.units ?? {}, turn);
    const cost = productionDueOnBoard(table, board, pack, turn.player, next.action.production?.units ?? {}, next);
    return cost === was ? next : withProductionPayment(next, pay({ amount: cost, kind: 'resources' }));
  }
  if (isCardTurn(turn) && isCardTurn(next)) {
    const was = cardCostOn(table, board, pack, turn);
    const cost = cardCostOn(table, board, pack, next);
    return cost.amount === was.amount && cost.kind === was.kind ? next : withCard(next, { effects: { ...effectsOf(next), payment: pay(cost) } });
  }
  return next;
}

// ---------------------------------------------------------------------------------------------------------------------
// The acts.

/** The acts of a turn; an empty list is kept as an empty list. */
export const withActs = (turn: Turn, acts: (Transaction | Expedition)[]): Turn => ({ ...turn, acts });

/** The act at an index replaced. */
export const withAct = (turn: Turn, index: number, act: Transaction | Expedition): Turn => withActs(turn, turn.acts.map((a, i) => (i === index ? act : a)));

/** The act at an index taken off. */
export const withoutAct = (turn: Turn, index: number): Turn => withActs(turn, turn.acts.filter((_, i) => i !== index));

/** A transaction with the first other player, or an expedition with no part yet, added at the end. */
export const withNewAct = (turn: Turn, kind: 'transaction' | 'expedition', first: PlayerId | undefined): Turn =>
  (kind === 'expedition'
    ? withActs(turn, [...turn.acts, { kind: 'expedition', slice: null, payment: { planets: [], tradeGoods: 0 } }])
    : first === undefined ? turn : withActs(turn, [...turn.acts, { kind: 'transaction', with: first, give: {}, get: {} }]));

// ---------------------------------------------------------------------------------------------------------------------
// A correction and an agenda.

type Numbers = Extract<Turn['action'], { kind: 'correction' | 'agenda' }>;
const onNumbers = (turn: Turn, change: (action: Numbers) => Numbers): Turn =>
  (turn.action.kind === 'correction' || turn.action.kind === 'agenda' ? { ...turn, action: change(turn.action) } : turn);

/** The label of a correction or an agenda. */
export const withLabel = (turn: Turn, label: string): Turn => onNumbers(turn, action => ({ ...action, label }));

/** The numbers a correction or an agenda changes. */
export const withDelta = (turn: Turn, delta: AdjustmentDelta): Turn => onNumbers(turn, action => ({ ...action, delta }));

/** The system a correction or an agenda puts its units in; the units already counted stay. */
export const withDeltaSystem = (turn: Turn, systemId: string): Turn =>
  (turn.action.kind === 'correction' || turn.action.kind === 'agenda'
    ? withDelta(turn, { ...turn.action.delta, units: { systemId, units: turn.action.delta.units?.units ?? {} } })
    : turn);

/** How an agenda was resolved; none clears it. */
export function withAgendaChoices(turn: Turn, choices: Record<string, string> | undefined): Turn {
  if (turn.action.kind !== 'agenda') return turn;
  return { ...turn, action: choices === undefined ? withoutKey(turn.action, 'choices') : { ...turn.action, choices } };
}

// ---------------------------------------------------------------------------------------------------------------------
// The status phase.

type Status = Extract<Turn['action'], { kind: 'status' }>;
const onStatus = (turn: Turn, change: (action: Status) => Status): Turn => (turn.action.kind === 'status' ? { ...turn, action: change(turn.action) } : turn);

/** The command tokens taken this round. */
export const withStatusTokens = (turn: Turn, values: { tactic?: number; fleet?: number; strategy?: number }): Turn => onStatus(turn, action => ({ ...action, ...values }));

/** The points a player gains in the status turn: the turn's own player, or another one's. */
export const roundPointsOf = (turn: Turn, player: PlayerId): number =>
  (turn.action.kind !== 'status' ? 0 : player === turn.player ? turn.action.vp ?? 0 : turn.action.opponentVp?.[player] ?? 0);

/** The points the viewer's player gains this round, or another player's. */
export const withRoundPoints = (turn: Turn, player: PlayerId, value: number): Turn =>
  onStatus(turn, action => (player === turn.player ? { ...action, vp: value } : { ...action, opponentVp: { ...action.opponentVp, [player]: value } }));

/** The objectives scored; an empty list drops the field. */
export const withScored = (turn: Turn, ids: ComponentId[]): Turn =>
  onStatus(turn, action => (ids.length > 0 ? { ...action, scored: ids } : withoutKey(action, 'scored')));

/** What the scoring cost; none drops the field. */
export const withSpend = (turn: Turn, spend: StatusSpend | undefined): Turn =>
  onStatus(turn, action => (spend === undefined ? withoutKey(action, 'spend') : { ...action, spend }));
