/**
 * What the plan screen is doing, as one state: what stands in the panel, what the next tap on the map chooses and the big
 * hex over the map. Impossible mixes cannot be written: a route belongs to a tactical action in
 * the panel, a card's pick to its card, and a state that undo left without its entry falls back on its own (`resolvePick`).
 */
import type { CardMapPick } from '../../../game/planQueries';
import type { Expedition, Transaction, Turn } from '../../../game/actions';
import type { Round } from '../../../game/round';
import { allTurns, isTacticalTurn, type TacticalTurn } from '../../../game/screenQueries';
import type { StageMode } from '../../map/stage/HexStage';

/** The entry being read in the list, and how many of its flights have started. */
export interface Shown { id: string; plays: number }

/**
 * - `list`: the round's entries, `shown` the one being read.
 * - `tactical`: the tactical editor. `entryId` is null while a new action waits for its system: the next tap creates the
 *   entry; `fromCard` makes that one Warfare's free action. `card` is the card editor it was opened from and returns to.
 *   `pickerFrom` is the source whose flight step stands in the editor's place.
 * - `card`, `adjustment`: their editors.
 */
export type Panel =
  | { kind: 'list'; shown: Shown | null }
  | { kind: 'tactical'; entryId: string | null; pickerFrom: string | null; fromCard?: string; card?: string }
  | { kind: 'card'; entryId: string }
  | { kind: 'adjustment'; entryId: string }
  /** A component action or a pass: the turn's acts, and the note of a component action. `fresh`: just added from the menu. */
  | { kind: 'turn'; entryId: string; fresh?: boolean }
  /** One act of a turn as a step of its editor; Back returns to `back`. */
  | { kind: 'act'; entryId: string; index: number; back: Panel };

/**
 * What the next tap on the map chooses. `idle` does what the panel does by default: opens the big hex, creates a waiting
 * tactical action, or takes a step of a route.
 */
export type NextTap =
  | { kind: 'idle' }
  | { kind: 'route'; path: string[] }
  | { kind: 'choose'; what: 'system' | 'source' }
  | { kind: 'card'; pick: CardMapPick }
  | { kind: 'adjustmentSystem' }
  /** The system a component action produces in. */
  | { kind: 'produce' }
  | { kind: 'placeTe' }
  | { kind: 'markIngress' };

/** Whom the big hex serves: the map itself, the card being played, a tactical action or a manual adjustment. */
export type StageFor = { kind: 'map' } | { kind: 'card' } | { kind: 'component'; id: string } | { kind: 'tactical'; id: string } | { kind: 'adjustment'; id: string };

export interface Stage { slot: string; mode: StageMode; only?: 'build' | 'units'; for: StageFor }

export interface PickState {
  panel: Panel;
  next: NextTap;
  stage: Stage | null;
  /** The row open in the list; it stays while an editor stands in its place. */
  openId: string | null;
}

export const IDLE: NextTap = { kind: 'idle' };
export const LIST: Panel = { kind: 'list', shown: null };
export const START: PickState = { panel: LIST, next: IDLE, stage: null, openId: null };

/** The turn of the round with this id, an action nested in a card too. */
export const find = (round: Round | undefined, id: string | null | undefined): Turn | undefined =>
  (id && round ? allTurns(round).find(turn => turn.id === id) : undefined);
export const tacticalIn = (round: Round | undefined, id: string | null | undefined): TacticalTurn | undefined => {
  const found = find(round, id);
  return isTacticalTurn(found) ? found : undefined;
};
export const cardIn = (round: Round | undefined, id: string | null | undefined): Turn | undefined => {
  const found = find(round, id);
  return found?.action.kind === 'strategic' || found?.action.kind === 'secondary' ? found : undefined;
};
export const turnIn = (round: Round | undefined, id: string | null | undefined): Turn | undefined => {
  const found = find(round, id);
  return found?.action.kind === 'component' ? found : undefined;
};
/** A manual correction or an agenda: what the plan calls an adjustment. */
export const adjustmentIn = (round: Round | undefined, id: string | null | undefined): Turn | undefined => {
  const found = find(round, id);
  return found?.action.kind === 'correction' || found?.action.kind === 'agenda' ? found : undefined;
};
/** The card turn whose nested action this is (Warfare's free action); none for a turn of its own. */
export const parentIn = (round: Round | undefined, id: string | null | undefined): Turn | undefined =>
  (id && round ? round.turns.find(turn => turn.action.kind === 'strategic' && turn.action.nested?.some(n => n.id === id)) : undefined);

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
  if (panel.kind === 'turn' && !['component', 'pass'].includes(find(round, panel.entryId)?.action.kind ?? '')) panel = LIST;
  if (panel.kind === 'act') {
    const host = find(round, panel.entryId);
    // An act undo took away returns to where it was opened from; with its turn gone, to the list.
    if (!host) panel = LIST;
    else if (!host.acts[panel.index]) panel = panel.back;
  }
  if (panel.kind === 'list' && panel.shown && round && !find(round, panel.shown.id)) panel = LIST;
  const { next } = state;
  const fits = next.kind === 'route' || next.kind === 'choose' ? panel.kind === 'tactical' && panel.entryId !== null
    : next.kind === 'card' ? panel.kind === 'card'
      : next.kind === 'adjustmentSystem' ? panel.kind === 'adjustment'
        : next.kind === 'produce' ? panel.kind === 'turn' : true;
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
    case 'produce':
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

/**
 * What the one slot of the panel shows: the list; the choice of a system for a new tactical action; the tactical editor
 * or, in its place, the flight step of one source; the strategy or adjustment editor; a turn and one act of it.
 */
export type Slot =
  | { kind: 'list' }
  | { kind: 'pickSystem'; fromCard?: string }
  | { kind: 'tactical'; entry: TacticalTurn }
  | { kind: 'flight'; entry: TacticalTurn; source: string }
  | { kind: 'card'; entry: Turn }
  | { kind: 'adjustment'; entry: Turn }
  | { kind: 'turn'; entry: Turn }
  | { kind: 'act'; entry: Turn; index: number; act: Transaction | Expedition; back: Panel };

/** The slot of a resolved state: an editor whose entry is gone shows the list. */
export function slotOf({ panel }: PickState, round: Round | undefined): Slot {
  switch (panel.kind) {
    case 'list':
      return { kind: 'list' };
    case 'tactical': {
      if (panel.entryId === null) return { kind: 'pickSystem', ...(panel.fromCard ? { fromCard: panel.fromCard } : {}) };
      const entry = tacticalIn(round, panel.entryId);
      if (!entry) return { kind: 'list' };
      return panel.pickerFrom === null ? { kind: 'tactical', entry } : { kind: 'flight', entry, source: panel.pickerFrom };
    }
    case 'card': {
      const entry = cardIn(round, panel.entryId);
      return entry ? { kind: 'card', entry } : { kind: 'list' };
    }
    case 'adjustment': {
      const entry = adjustmentIn(round, panel.entryId);
      return entry ? { kind: 'adjustment', entry } : { kind: 'list' };
    }
    case 'turn': {
      const entry = find(round, panel.entryId);
      return entry?.action.kind === 'component' || entry?.action.kind === 'pass' ? { kind: 'turn', entry } : { kind: 'list' };
    }
    case 'act': {
      const entry = find(round, panel.entryId);
      const act = entry?.acts[panel.index];
      return entry && act ? { kind: 'act', entry, index: panel.index, act, back: panel.back } : { kind: 'list' };
    }
  }
}
