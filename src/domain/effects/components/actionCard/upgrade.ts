/**
 * Upgrade (action card, After you activate a system that contains 1 or more of your ships): "Replace 1 of your
 * cruisers in that system with 1 dreadnought from your reinforcements."
 *
 * A `play` of a card used beside my tactical action (`uses`), run at the activation (`playAt`), before any movement:
 * one of my cruisers in the active system, there when it was activated, is replaced by a dreadnought. A missing
 * cruiser is reported as any missing unit (`unitsMissing`). The dreadnought is placed, not produced.
 */
import type { ComponentEffect } from '../../types';
import { add, take } from '../../../replay/state';

export const id = 'actionCard:upgrade';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  playAt: 'activation',
  play: turn => {
    if (turn.entry.type !== 'tactical' || turn.entry.systemId === null) return;
    const slot = turn.entry.systemId;
    const taken = take(turn.state.systems, slot, { cruiser: 1 }, turn.warnings, 'activation');
    if (taken.cruiser) add(turn.state.systems, slot, { dreadnought: 1 });
  },
};
