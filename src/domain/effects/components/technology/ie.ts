/**
 * Integrated Economy: "After you gain control of a planet, you may produce any number of units on that planet that have
 * a combined cost equal to or less than that planet's resource value."
 *
 * Pass 2 makes it a `passive` waiver of `noProduction` (67, 79), narrowed with `when`: the entry gained control of a
 * planet of the system and the combined cost of the production is at most that planet's resources. The units are still
 * paid for (ruling 1). Today a hint.
 */
import { planetValue } from '../../../payment';
import { controlGained } from '../../../replay/invasion';
import { costOf } from '../../../replay/production';
import { systemOfPlanet } from '../../../stacks';
import type { ComponentEffect } from '../../types';

export const id = 'technology:ie';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{
    code: 'noProduction',
    rule: 'After you gain control of a planet, you may produce any number of units on that planet that have a combined cost equal to or less than that planet\'s resource value.',
    when: (warning, ctx) => {
      const { entry, game, pack, before, after } = ctx;
      if (entry?.type !== 'tactical') return false;
      const systemId = String(warning.params.systemId);
      const taken = controlGained(before, after).filter(planetId => systemOfPlanet(game, planetId, pack) === systemId);
      if (taken.length === 0) return false;
      // Ruling 1: the units are paid for, and no unit used PRODUCTION, so Sarween Tools takes nothing off.
      const cost = costOf(game, before, entry.production, pack, false, entry);
      return taken.some(planetId => cost <= planetValue(pack, after, planetId, 'resources'));
    },
  }],
};
