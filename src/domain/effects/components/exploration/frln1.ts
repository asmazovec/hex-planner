/**
 * Freelancers (frontier exploration, Prophecy of Kings): "You may produce 1 unit in this system. You may spend influence
 * as if it were resources to produce this unit."
 *
 * Decided: `play` with waivers, named in the `uses` of the tactical action that explores the system. The production
 * checks of the rules stand for everyone: no unit with Production in the system (`noProduction`, 67.1) and resources
 * short of the cost (`shortResources`, 67.2, 68.1). The card lifts the first for exactly one unit produced in the
 * active system, and the second where the influence of the planets spent, with the trade goods, covers the cost (a
 * planet gives its influence or its resources, not both: exploration notes, Freelancers 1). Pass 2: written.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'exploration:frln1';

export const ability: Ability = {
  holder: 'self',
  tier: 'play',
  rule: id,
  permit: [
    {
      code: 'noProduction',
      rule: 'You may produce 1 unit in this system.',
      // One unit only: the card gives no Production to a second.
      when: (_warning, { entry }) => entry?.type === 'tactical' && Object.values(entry.production).reduce((sum, n) => sum + (n ?? 0), 0) <= 1,
    },
    {
      code: 'shortResources',
      rule: 'You may spend influence as if it were resources to produce this unit.',
      // The influence of the planets paid, with the trade goods, covers the cost (a planet gives one value, not both).
      when: (warning, { entry, prior }) => {
        if (entry?.type !== 'tactical') return false;
        const influence = entry.payment.planets.reduce((sum, planetId) => sum + prior.planetValue(planetId, 'influence'), 0);
        return influence + entry.payment.tradeGoods >= Number(warning.params.needed);
      },
    },
  ],
};
