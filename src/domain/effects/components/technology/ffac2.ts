/**
 * Floating Factory II (Clan of Saar, unit upgrade of the space dock): "Move 2, Capacity 5 / PRODUCTION 7. / This unit is
 * placed in the space area instead of on a planet. / This unit can move and retreat as if it were a ship. / If this
 * unit is blockaded, it is destroyed."
 *
 * A unit upgrade: its numbers are generated (`unitUpgrades.ts`) from the level II of the space dock, which gives the
 * dock its planet's resources plus 4. The printed PRODUCTION 7 is a flat value, not added to a planet's resources.
 * Decided (pass 2 to build): a `modify` of `productionValue` that sets a dock of this player to 7. What makes the
 * Floating Factory a ship (space area, move, capacity, destroyed when blockaded) is not modelled: the app keeps docks
 * on planets only (85.1.1 and 79.4.1 are test.todo in the rules tests).
 */
import type { Ability } from '../../../../game/abilities/types';
import '../../points/production';

export const id = 'technology:ffac2';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: '97.4',
  // The printed PRODUCTION 7 is flat: the dock of this player is worth 7 whatever its planet gives.
  modify: { productionValue: (value, ctx) => (ctx.structure === 'spacedock' ? 7 : value) },
};
