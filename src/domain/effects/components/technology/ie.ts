/**
 * Integrated Economy: "After you gain control of a planet, you may produce any number of units on that planet that have
 * a combined cost equal to or less than that planet's resource value."
 *
 * Pass 2 makes it a `passive` waiver of `noProduction` (67, 79), narrowed with `when`: the entry gained control of a
 * planet of the system and the combined cost of the production is at most that planet's resources. The units are still
 * paid for (ruling 1). Today a hint.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:ie';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{
    code: 'noProduction',
    rule: 'After you gain control of a planet, you may produce any number of units on that planet that have a combined cost equal to or less than that planet\'s resource value.',
    when: (warning, ctx) => {
      const { entry } = ctx;
      if (entry?.type !== 'tactical') return false;
      const systemId = String(warning.params.systemId);
      const taken = ctx.planetsIn(systemId).filter(planetId => ctx.board.planets[planetId]?.owner === ctx.holder && ctx.before.planets[planetId]?.owner !== ctx.holder);
      if (taken.length === 0) return false;
      // Ruling 1: the units are paid for, and no unit used PRODUCTION, so Sarween Tools takes nothing off.
      const cost = ctx.productionCostOf(entry.production);
      return taken.some(planetId => cost <= ctx.planetValue(planetId, 'resources'));
    },
  }],
};
