/**
 * What the plan screen is doing, as one state: what stands in the panel, what the next tap on the map chooses, the big
 * hex and the builder's sheet over the map. Impossible mixes cannot be written: a route belongs to a tactical action in
 * the panel, a card's pick to its card, and a state that undo left without its entry falls back on its own (`resolvePick`).
 */
import type { CardMapPick } from '../../../domain/replay/cards/targets';
import type { Entry, Round } from '../../../domain/types';
import type { StageMode } from '../../map/stage/HexStage';

/** The entry being read in the list, and how many of its flights have started. */
export interface Shown { id: string; plays: number }

/**
 * - `list`: the round's entries, `shown` the one being read.
 * - `tactical`: the tactical editor. `entryId` is null while a new action waits for its system: the next tap creates the
 *   entry; `fromCard` makes that one Warfare's free action. `card` is the card editor it was opened from and returns to.
 * - `card`, `adjustment`: their editors.
 */
export type Panel =
  | { kind: 'list'; shown: Shown | null }
  | { kind: 'tactical'; entryId: string | null; pickerFrom: string | null; fromCard?: string; card?: string }
  | { kind: 'card'; entryId: string }
  | { kind: 'adjustment'; entryId: string };

/**
 * What the next tap on the map chooses. `idle` does what the panel does by default: opens the big hex or the builder's
 * sheet, creates a waiting tactical action, or takes a step of a route.
 */
export type NextTap =
  | { kind: 'idle' }
  | { kind: 'route'; path: string[] }
  | { kind: 'choose'; what: 'system' | 'source' }
  | { kind: 'card'; pick: CardMapPick }
  | { kind: 'adjustmentSystem' }
  | { kind: 'placeTe' }
  | { kind: 'markIngress' };

/** Whom the big hex serves: the map itself, the card being played, a tactical action or a manual adjustment. */
export type StageFor = { kind: 'map' } | { kind: 'card' } | { kind: 'tactical'; id: string } | { kind: 'adjustment'; id: string };

export interface Stage { slot: string; mode: StageMode; only?: 'build' | 'units'; for: StageFor }

export interface PickState {
  panel: Panel;
  next: NextTap;
  stage: Stage | null;
  /** The builder's sheet of a slot. */
  sheet: string | null;
  /** The row open in the list; it stays while an editor stands in its place. */
  openId: string | null;
}

export const IDLE: NextTap = { kind: 'idle' };
export const LIST: Panel = { kind: 'list', shown: null };
export const START: PickState = { panel: LIST, next: IDLE, stage: null, sheet: null, openId: null };

type TacticalEntry = Extract<Entry, { type: 'tactical' }>;
type CardEntry = Extract<Entry, { type: 'strategic' | 'secondary' }>;
type AdjustmentEntry = Extract<Entry, { type: 'adjustment' }>;

const find = (round: Round | undefined, id: string | null | undefined) => (id ? round?.entries.find(e => e.id === id) : undefined);
export const tacticalIn = (round: Round | undefined, id: string | null | undefined) => {
  const found = find(round, id);
  return found?.type === 'tactical' ? found as TacticalEntry : undefined;
};
export const cardIn = (round: Round | undefined, id: string | null | undefined) => {
  const found = find(round, id);
  return found?.type === 'strategic' || found?.type === 'secondary' ? found as CardEntry : undefined;
};
export const adjustmentIn = (round: Round | undefined, id: string | null | undefined) => {
  const found = find(round, id);
  return found?.type === 'adjustment' ? found as AdjustmentEntry : undefined;
};

/** Where an editor goes back to: the card it was opened from, or the list. */
export const backFrom = (panel: Panel): Panel => (panel.kind === 'tactical' && panel.card ? { kind: 'card', entryId: panel.card } : LIST);

/**
 * The state as the round now has it: undo can remove the entry an editor holds, which ends that editor (a tactical
 * action opened from a card goes back to the card), and with it what the map was choosing for it.
 */
export function resolvePick(state: PickState, round: Round | undefined): PickState {
  let { panel } = state;
  if (panel.kind === 'tactical' && panel.entryId !== null && !tacticalIn(round, panel.entryId)) panel = backFrom(panel);
  if (panel.kind === 'card' && !cardIn(round, panel.entryId)) panel = LIST;
  if (panel.kind === 'adjustment' && !adjustmentIn(round, panel.entryId)) panel = LIST;
  if (panel.kind === 'list' && panel.shown && round && !find(round, panel.shown.id)) panel = LIST;
  const { next } = state;
  const fits = next.kind === 'route' || next.kind === 'choose' ? panel.kind === 'tactical' && panel.entryId !== null
    : next.kind === 'card' ? panel.kind === 'card'
      : next.kind === 'adjustmentSystem' ? panel.kind === 'adjustment' : true;
  if (panel === state.panel && fits) return state;
  return { ...state, panel, next: fits ? next : IDLE };
}

/** Whether the map is choosing for the Thunder's Edge panel, which then stands aside. */
export const choosesForTe = (next: NextTap): boolean => next.kind === 'placeTe' || next.kind === 'markIngress';

/** The key of the hint over the map for what the next tap chooses; null when the panel's default needs none. */
export function hintKey(state: PickState): string | null {
  const { next, panel } = state;
  switch (next.kind) {
    case 'card':
    case 'adjustmentSystem':
      return 'plan.strategy.mapHint';
    case 'markIngress':
      return 'fracture.markHint';
    case 'placeTe':
      return 'expedition.placeHint';
    case 'choose':
      return next.what === 'system' ? 'plan.tactical.changeSystemHint' : 'plan.tactical.addSourceHint';
    case 'route':
      return 'plan.tactical.tapHint';
    case 'idle':
      if (panel.kind === 'tactical' && panel.entryId === null) return panel.fromCard ? 'plan.tactical.freePickHint' : 'plan.tactical.pickHint';
      return null;
  }
}
