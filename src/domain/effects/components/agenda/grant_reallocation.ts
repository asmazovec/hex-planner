/**
 * Research Grant Reallocation (directive): "The elected player gains any 1 technology of their choice. Then, for each
 * prerequisite on that technology, they remove 1 token from their fleet pool and return it to their reinforcements."
 *
 * Decided: play. The elected player gains the technology entered among the agenda entry's gains (already counted), then
 * loses 1 fleet pool token per prerequisite of it, never below 0 (rulings), after which the fleet pool is checked
 * (37.3).
 */
import { gainTokens } from '../../../replay/status';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:grant_reallocation';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    const gained = (turn.entry.gains ?? []).find(item => item.startsWith('technology:'));
    const tech = gained === undefined ? undefined : turn.pack.technologies[gained.slice('technology:'.length)];
    const owed = Object.values(tech?.requires ?? {}).reduce((sum, count) => sum + (count ?? 0), 0);
    if (owed > 0) gainTokens(turn, { fleet: -Math.min(owed, Math.max(0, turn.state.fleet)) });
  },
};
