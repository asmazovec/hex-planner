/**
 * Adjudicator Ba'al, Nova Seed (Embers of Muaat, hero): "After you move a war sun into a non-home system other than
 * Mecatol Rex: You may destroy all other players' units in that system and replace that system tile with the Muaat
 * supernova tile. If you do, purge this card and each planet card that corresponds to the replaced system tile."
 *
 * Decided: `play`, named in the `uses` of the tactical action that moved the war sun (purged as every hero is). What
 * it does to the board, a tile replaced by a supernova and the other players' units destroyed, cannot be replayed:
 * the replay never changes the map. Pass 1: still the hint it is today.
 */
import { removeUnits, structures } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { othersBy } from '../../helpers/cardPlay';

export const id = 'leader:muaathero';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  // Named with the move of the war sun: the other players' units in the active system are destroyed. The tile
  // replaced by the supernova and the planet cards purged are not replayed (the replay never changes the map).
  play: ctx => {
    const entry = ctx.entry;
    if (entry?.type !== 'tactical' || entry.systemId === null) return [];
    const slot = entry.systemId;
    return othersBy(ctx).flatMap(who => {
      const them = ctx.of(who);
      const space = them.unitsIn(slot);
      return [
        ...(Object.keys(space).length > 0 ? [removeUnits(who, { slot }, space)] : []),
        ...ctx.planetsIn(slot).flatMap(planetId => {
          const ground = them.unitsOn(planetId);
          const built = them.structures().find(each => each.planet === planetId)?.structures ?? {};
          return [
            ...(Object.keys(ground).length > 0 ? [removeUnits(who, { planet: planetId }, ground)] : []),
            ...(Object.keys(built).length > 0 ? [structures.remove(who, planetId, built)] : []),
          ];
        }),
      ];
    });
  },
};
