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
import { placeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:sar';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    const entry = ctx.entry;
    if (entry?.type !== 'tactical' || !entry.systemId) return [];
    const producing = Object.values(entry.production).some(count => (count ?? 0) > 0);
    if (!producing) return [];
    // On a planet I control in that system, never in its space area (ruling 2); the first one when several are.
    const planetId = ctx.planetsIn(entry.systemId).find(id => ctx.board.planets[id]?.owner === ctx.holder);
    return planetId === undefined ? [] : [placeUnits(ctx.holder, { planet: planetId }, { mech: 1 })];
  },
};
