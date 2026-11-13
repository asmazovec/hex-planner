/**
 * What the status subsystem adds to the contract of effects, by declaration merging so that the shared interfaces of
 * `../types` stay as they are: two points of the count, the hooks a law, an objective or a card with a one-time effect
 * needs, and the helpers that ask them. See docs/phase4/infra/status.md.
 *
 * Points (asked with `applied`, or with `appliedFor` of `../entryApply` when the entry's own components take part):
 *  - `secretLimit`: how many secret objectives a player may have, scored or not (LRR 61.21); base 3.
 *  - `strategyCost`: how many strategy tokens a card's primary (as a token play) or secondary costs (83.3, 83.4, 20.5); base 1.
 *  - `tokensGained` (step `status`), `handLimit` and `vp` were declared before; the first two are asked now.
 */
import type { CardRound } from '../../replay/cards/index';
import objectiveUnmet from '../../rules/codes/objectiveUnmet';
import { violation } from '../../rules/registry';
import type { DataPack, Entry, Game, GameState, Warning } from '../../types';
import { componentById } from '../../components';
import { applyPayment, checkPayment } from '../../replay/payment';
import { playedBy } from '../waivers';
import type { ComponentEffect, EffectTurn } from '../types';

/** What a requirement of an objective is asked with: the owner's board before the status entry that scores it. */
export interface RequirementContext {
  pack: DataPack;
  /** The game as the owner of the entry sees it. */
  game: Game;
  /** The owner's state just before the entry. */
  state: GameState;
  /** My state: laws, revealed objectives, attachments. */
  shared: GameState;
  /** The status entry that scores the objective. */
  entry: Extract<Entry, { type: 'statusTokens' }>;
  /** The component id of the objective. */
  objective: string;
}

declare module '../types' {
  interface ModifierContext {
    /** How many secret objectives a player may have, scored or not. */
    secretLimit: { faction: string };
    /** The strategy tokens a card's primary played for a token, or its secondary, costs: 0 for none. */
    strategyCost: { card: number | undefined; secondary: boolean };
  }

  interface EffectTurn {
    /** The round's cards: who holds and has played which, and `freeSecondary` and `states` of every player. Set on the entries of a round. */
    cards?: CardRound;
  }

  interface ComponentEffect {
    /**
     * An objective: what its requirement counts when a status entry scores it. `have < need` is the warning
     * `objectiveUnmet`. Asked against the owner's board before the entry (LRR 81.1 note 1).
     */
    requirement?: (ctx: RequirementContext) => { have: number; need: number };
    /** A law in force: the components of this id that are not in force while it is (Articles of War takes away the mechs). */
    suppresses?: (id: string) => boolean;
  }
}

/** The action cards an entry plays: its component action, what it spends and what it names in `uses`. */
export function actionCardsPlayed(entry: Entry, pack: DataPack): string[] {
  return playedBy(entry).filter(id => componentById(pack, id)?.kind === 'actionCard');
}

/** The warning of an objective whose requirement is not met; `have` and `need` are what the objective counts. */
export function objectiveNotMet(objective: string, have: number, need: number): Warning {
  return violation(objectiveUnmet.code, { objective, have, need }, 'status');
}

/** What the status entry's `spend` paid: command tokens from the pools, trade goods, the resources and the influence of the planets exhausted. */
export interface Spent { tokens: number; tradeGoods: number; resources: number; influence: number }

const PAID = new WeakMap<GameState, Map<string, Spent>>();

/**
 * Takes what the status entry's `spend` names (LRR 61.10) from the board, once for the entry however many objectives it
 * scores, and says what it came to, so that each objective's own `play` compares it with the cost on its card:
 *   const spent = spentOnObjectives(turn);
 *   if (spent.tokens < 6) turn.warnings.push(objectiveNotMet(id, spent.tokens, 6));
 * Warns by itself of a pool taken below zero (`poolNegative`), of trade goods not held (`shortTradeGoods`) and of planets
 * not controlled or already exhausted (`planetNotControlled`, `planetExhausted`), all at the step `status`. A cost is a
 * number the objective names, so it never warns of too little: that is the objective's own `objectiveUnmet`.
 */
export function spentOnObjectives(turn: EffectTurn): Spent {
  const done = PAID.get(turn.state) ?? new Map<string, Spent>();
  PAID.set(turn.state, done);
  const known = done.get(turn.entry.id);
  if (known) return known;
  const spend = turn.entry.type === 'statusTokens' ? turn.entry.spend ?? {} : {};
  const { state, warnings } = turn;
  let tokens = 0;
  for (const pool of ['tactic', 'fleet', 'strategy'] as const) {
    const count = spend[pool] ?? 0;
    if (count <= 0) continue;
    state[pool] -= count;
    tokens += count;
    if (state[pool] < 0) warnings.push(violation('poolNegative', { pool, have: state[pool] }, 'status'));
  }
  const tradeGoods = Math.max(0, spend.tradeGoods ?? 0);
  if (tradeGoods > state.tradeGoods) warnings.push(violation('shortTradeGoods', { needed: tradeGoods, have: state.tradeGoods }, 'status'));
  state.tradeGoods -= Math.min(tradeGoods, state.tradeGoods);
  const paid = (kind: 'resources' | 'influence'): number => {
    const payment = { planets: spend[kind]?.planets ?? [], tradeGoods: 0 };
    for (const warning of checkPayment(state, payment)) warnings.push(violation(warning.code, warning.params, 'status'));
    return applyPayment(state, payment, kind, turn.pack);
  };
  const spent = { tokens, tradeGoods, resources: paid('resources'), influence: paid('influence') };
  done.set(turn.entry.id, spent);
  return spent;
}

export type { ComponentEffect };
