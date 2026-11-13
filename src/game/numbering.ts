/**
 * What the turns of a round say about themselves, so that no screen counts them again: the number of a tactical action
 * (a player's own circle, counted in order, a cancelled one without a number, Warfare's nested one at the place of its
 * card) and the status of a turn (a nested action has its card's).
 */
import type { Turn } from './actions';

/** The number of each tactical action of a round, by turn id (the nested one of a card by its own id). */
export function turnNumbers(turns: readonly Turn[]): Record<string, number> {
  const numbers: Record<string, number> = {};
  const counted = new Map<string, number>();
  const count = (turn: Turn): void => {
    const next = (counted.get(turn.player) ?? 0) + 1;
    counted.set(turn.player, next);
    numbers[turn.id] = next;
  };
  for (const turn of turns) {
    if (turn.status === 'cancelled') continue;
    // The free action of a card is taken right after the card: it is counted there.
    if (turn.action.kind === 'strategic') for (const inner of turn.action.nested ?? []) if (inner.action.kind === 'tactical') count(inner);
    if (turn.action.kind === 'tactical') count(turn);
  }
  return numbers;
}

/** The number of one turn's tactical action, or none for a turn without one. */
export const turnNumber = (turns: readonly Turn[], turnId: string): number | undefined => turnNumbers(turns)[turnId];

/** The status of a turn of a round; an action nested in a card has the status of its card. */
export function statusOf(turns: readonly Turn[], turnId: string): Turn['status'] | undefined {
  for (const turn of turns) {
    if (turn.id === turnId) return turn.status;
    if (turn.action.kind === 'strategic' && turn.action.nested?.some(inner => inner.id === turnId)) return turn.status;
  }
  return undefined;
}
