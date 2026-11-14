/**
 * Gurno Aggero, Armageddon Relay (Clan of Saar, hero): "ACTION: Choose 1 system that is adjacent to 1 of your space
 * docks. Destroy all other players' infantry and fighters in that system. Then, purge this card."
 *
 * Decided (pass 2 to build): a `play` effect of its component action with the choice `system`: every other player's
 * infantry and fighters in that system, in its space area and on its planets, are destroyed; mine stay. The replay
 * already purges a hero when it is played. A system that is not adjacent to one of my docks (a dock's own system is
 * not adjacent to itself, Saar note on the hero) is a breach still to be checked.
 */
import type { ComponentEffect } from '../../types';
import { removeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { othersBy } from '../../helpers/cardPlay';

export const id = 'leader:saarhero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'system', kind: 'system' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const slot = String(ctx.choices.system ?? '');
    if (slot === '') return [];
    // Every other player's infantry and fighters, in the space area and on the planets of the system.
    return othersBy(ctx).flatMap(who => {
      const them = ctx.of(who);
      const at = [{ slot } as const, ...ctx.planetsIn(slot).map(planet => ({ planet }) as const)];
      return at.flatMap(place => {
        const units = 'slot' in place ? them.unitsIn(place.slot) : them.unitsOn(place.planet);
        const gone = { ...(units.infantry ? { infantry: units.infantry } : {}), ...(units.fighter ? { fighter: units.fighter } : {}) };
        return Object.keys(gone).length > 0 ? [removeUnits(who, place, gone)] : [];
      });
    });
  },
};
