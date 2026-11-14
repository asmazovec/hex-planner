import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPack } from '../../../data/loadPack';
import { emptySources, tacticalOf, withoutSource } from '../../../game/edit/tactical';
import { atOf } from '../../../game/edit/tacticalRead';
import { useGame } from '../../../state/gameStore';
import { timelineOf } from '../../../state/projection';
import { writeSaved } from '../../../state/turnBridge';
import { animates } from '../../common/motion';

/**
 * How long a source takes to leave: its row folds and its arrow fades over `--motion-route`, and the rest is the margin
 * of the timer that takes the source away when no end of a transition was heard.
 */
export const LEAVE_MS = 400;

/** A leaving source, by the key its arrow has on the map. */
export const leaveKey = (entryId: string, source: string): string => `${entryId}:${source}`;

/** The turn of the entry as the store has it now, its writer and the places of the board before it, while the entry is a tactical action. */
function turnNow(entryId: string) {
  const { saved } = useGame.getState();
  if (!saved) return null;
  const pack = loadPack(saved.table.expansions);
  const kernel = timelineOf(saved, saved.activePlanId, 'forecast', pack);
  const write = writeSaved(saved, entryId);
  if (!write || write.turn.action.kind !== 'tactical') return null;
  return { write, at: atOf(kernel.table, kernel.byTurn.get(entryId)?.before ?? kernel.end, pack) };
}

/** The entry as the store has it now, and whether its source still has nothing chosen. */
function emptyNow(entryId: string, source: string) {
  const now = turnNow(entryId);
  return now && emptySources(now.at, tacticalOf(now.write.turn)).includes(source) ? now : null;
}

/** Takes the source out of its entry, if it is still there with nothing chosen. Works on the store, for it runs on unmount too. */
function drop(entryId: string, source: string): void {
  const empty = emptyNow(entryId, source);
  if (empty) empty.write.update(withoutSource(empty.at, empty.write.turn, source));
}

/**
 * The sources on their way out of the plan. A source left with nothing chosen does not stay in its entry: its row and
 * its arrow fade first (`leaving` names them), then it goes, by the end of the row's transition (`finish`) or by a timer
 * when none was heard. Without smooth motion it goes at once. `keep` takes one back that was opened again.
 */
export function useLeavingSources() {
  const [leaving, setLeaving] = useState<string[]>([]);
  const timers = useRef(new Map<string, { entryId: string; source: string; timer: ReturnType<typeof setTimeout> }>());

  const keep = useCallback((entryId: string, source: string) => {
    const key = leaveKey(entryId, source);
    const waiting = timers.current.get(key);
    if (!waiting) return;
    clearTimeout(waiting.timer);
    timers.current.delete(key);
    setLeaving(keys => keys.filter(other => other !== key));
  }, []);

  const finish = useCallback((entryId: string, source: string) => {
    if (!timers.current.has(leaveKey(entryId, source))) return;
    keep(entryId, source);
    drop(entryId, source);
  }, [keep]);

  const leave = useCallback((entryId: string, source: string) => {
    const key = leaveKey(entryId, source);
    if (timers.current.has(key) || !emptyNow(entryId, source)) return;
    if (!animates()) {
      drop(entryId, source);
      return;
    }
    timers.current.set(key, { entryId, source, timer: setTimeout(() => finish(entryId, source), LEAVE_MS) });
    setLeaving(keys => [...keys, key]);
  }, [finish]);

  // The screen closes during a transition: what was leaving goes now.
  useEffect(() => {
    const waiting = timers.current;
    return () => {
      for (const { entryId, source, timer } of waiting.values()) {
        clearTimeout(timer);
        drop(entryId, source);
      }
      waiting.clear();
    };
  }, []);

  return { leaving, leave, keep, finish };
}
