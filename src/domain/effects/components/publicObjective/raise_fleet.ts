/**
 * Raise a Fleet (public objective, stage I, Prophecy of Kings): "Have 5 or more non-fighter ships in 1 system."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the most non-fighter ships the owner has in one space area;
 * unmet is the warning objectiveUnmet (61.5.1).
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:raise_fleet';

const SHIPS = ['carrier', 'cruiser', 'destroyer', 'dreadnought', 'flagship', 'warsun'] as const;

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ state }) => ({
    have: Math.max(0, ...Object.values(state.systems).map(units => SHIPS.reduce((sum, ship) => sum + Math.max(0, units[ship] ?? 0), 0))),
    need: 5,
  }),
};
