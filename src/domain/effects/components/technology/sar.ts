/**
 * Self-Assembly Routines (technology, Prophecy of Kings): "After 1 or more of your units use PRODUCTION, you may
 * exhaust this card to place 1 mech from your reinforcements on a planet you control in that system. After 1 of your
 * mechs is destroyed, gain 1 trade good."
 *
 * Decided: played by naming it in the `uses` of an entry that produces: after the production one mech stands on a
 * planet I control in that system (not in its space area, ruling 2). The trade good for a destroyed mech could be read
 * from the losses entered (`losses`, `groundLosses`), but one effect has one tier; it stays a reminder for now.
 * Pass 2: play, the mech only; the trade good stays a reminder.
 */
import { planetsOf } from '../../../replay/board';
import type { ComponentEffect } from '../../types';

export const id = 'technology:sar';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ game, pack, state, entry }) => {
    if (entry.type !== 'tactical' || !entry.systemId) return;
    const producing = Object.values(entry.production).some(count => (count ?? 0) > 0);
    if (!producing) return;
    // On a planet I control in that system, never in its space area (ruling 2); the first one when several are.
    const planetId = planetsOf(game, entry.systemId, pack).find(id => state.control[id] === 'me');
    if (planetId === undefined) return;
    const here = state.ground[planetId] ?? {};
    state.ground[planetId] = { ...here, mech: (here.mech ?? 0) + 1 };
  },
};
