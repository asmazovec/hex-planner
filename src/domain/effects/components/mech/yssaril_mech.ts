/**
 * Blackshade Infiltrator (Yssaril, mech): "DEPLOY: After you use your Stall Tactics faction ability, you may place
 * 1 mech on a planet you control."
 *
 * Decided: a `play` named in `uses` of the Stall Tactics component action: one mech from the reinforcements goes on
 * the planet of the choice `planet` (asked of the mech in «Used»; the entry's own `choices.planet` is read too).
 * A planet the Yssaril do not control gets nothing and is warned of (`placeNotControlled`, 67.4.1). Named anywhere
 * else it does nothing, and so it does for another faction. Reinforcements are not counted.
 */
import placeNotControlled from '../../../rules/codes/placeNotControlled';
import { planetsOf, systemSlots } from '../../../replay/board';
import { placeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'mech:yssaril_mech';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'planet', kind: 'planet',
    options: ({ game, pack, state }) => [...new Set(systemSlots(game).flatMap(slot => planetsOf(game, slot, pack)))].filter(planetId => state.control[planetId] === 'me'),
  }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const entry = ctx.entry;
    if (!ctx.held || ctx.my.faction !== 'yssaril' || entry?.type !== 'component' || entry.componentId !== 'ability:stall_tactics') return [];
    const planet = ctx.choices.planet ?? entry.choices?.planet;
    if (planet === undefined || ctx.pack.planets[String(planet)] === undefined) return [];
    if (ctx.board.planets[String(planet)]?.owner !== ctx.holder) {
      ctx.warn(violation(placeNotControlled.code, { planetId: String(planet) }));
      return [];
    }
    return [placeUnits(ctx.holder, { planet: String(planet) }, { mech: 1 })];
  },
};
