/** The round (LRR 40): its phases in order, and the entries that only mark the flow of the round. */
import type { Phase, Warning } from '../types';

/** The phases of a round in the order they are played, whatever the order of the plan's list. */
export const PHASE_ORDER: Phase[] = ['strategy', 'action', 'status', 'agenda'];

/** Check of a pass or a component action: nothing the replay tracks yet. */
// TODO(P2-042) #ws:round-flow #type:check #rule:3.3 #rule:3.4 #rule:82.2 #rule:40.2 #test:003-action-phase #test:082-strategic-action #test:040-game-round #size:m #pass — Пас ничего не проверяет: пас до своих стратегических действий, действия после паса, действие не в своей фазе
export function checkFlow(): Warning[] {
  return [];
}
