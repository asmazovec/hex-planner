/**
 * How the blocks of an editor ask the kernel what a press would cause (`src/game/options.ts`): the point of the turn
 * being edited, and the text an option that leads to a warning says of itself. The look is one everywhere: a clean
 * option is drawn as always, one that leads to a warning dashed and dimmed, and nothing is ever disabled by it.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DataPack } from '../../domain/types';
import type { Turn } from '../../game/actions';
import type { Round } from '../../game/round';
import { causesKept, type Candidate, type Point } from '../../state/projection';
import { reasonOf } from '../feedback/WarningText';
import type { KernelView } from './kernelView';

/** What an option says it would cause; nothing for a clean one. */
export type Why = (candidate: Candidate) => string | undefined;

/**
 * The point of the turn an editor holds. The plan screen gives the one of the timeline (the round's memory with it); an
 * editor drawn alone, or one whose turn the timeline has not caught up with, asks on the board it was given.
 */
export function usePoint(view: KernelView, pack: DataPack, turn: Turn, given?: Point, extra: { manual?: boolean; round?: Round } = {}): Point {
  const { manual, round } = extra;
  return useMemo(
    () => (given && given.turn === turn && (given.manual ?? false) === (manual ?? false) ? given
      : { table: view.table, pack, board: view.board, turn, ...(given?.track ? { track: given.track, lead: given.lead } : {}), ...(round ?? given?.round ? { round: round ?? given?.round } : {}), ...(manual ? { manual } : {}) }),
    [view, pack, turn, given, manual, round],
  );
}

/** The reader of a point for the blocks: each candidate is asked once, when a block draws it. */
export function useWhy(point: Point | undefined): Why {
  const { t } = useTranslation();
  return useMemo(
    () => (candidate: Candidate) => (point ? reasonOf(causesKept(point, candidate), point.table, point.board, point.pack, t) : undefined),
    [point, t],
  );
}
