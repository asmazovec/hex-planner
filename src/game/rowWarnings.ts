/** What each row of the plan breaks, read from the frames of the kernel's timeline: the warnings the screens put on a row and in its editor. */
import type { Warning } from '../domain/types';
import type { Timeline } from './timeline';

const made = new WeakMap<Timeline, Record<string, Warning[]>>();

/**
 * The warnings of every turn of the timeline that was applied, by turn id. A card speaks for Warfare's free action in
 * its nested turn: the warnings placed on the nested turn are its own, the rest the card's.
 */
export function warningsByTurn(line: Timeline): Record<string, Warning[]> {
  const known = made.get(line);
  if (known) return known;
  const found: Record<string, Warning[]> = {};
  for (const round of line.rounds) {
    for (const turn of round.turns) {
      const frame = line.byTurn.get(turn.id);
      if (!frame?.applied) continue;
      const inner = turn.action.kind === 'strategic' ? (turn.action.nested ?? []).map(n => n.id) : [];
      const placedIn = (id: string) => (w: Warning): boolean => w.place?.entryId === id;
      found[turn.id] = inner.length === 0 ? frame.violations : frame.violations.filter(w => !inner.some(id => placedIn(id)(w)));
      for (const id of inner) found[id] = frame.violations.filter(placedIn(id));
    }
  }
  made.set(line, found);
  return found;
}
