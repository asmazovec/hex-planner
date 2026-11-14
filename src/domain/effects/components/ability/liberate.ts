/**
 * Liberate (Last Bastion, faction ability): "When you gain control of a planet: ready that planet if it contains a
 * number of your infantry equal to or greater than that planet's resource value; otherwise, place 1 infantry on that
 * planet."
 *
 * Decided: an automatic change of the board when the Last Bastion gains control of a planet (49.5): a planet newly
 * gained enters exhausted (49.5.2), and Liberate readies it when its infantry are at least its resources, or else puts
 * one infantry from the reinforcements on it. The number of mechs does not matter (Last Bastion, Liberate 2). Nothing
 * is waived: the rule of the exhausted planet still holds for every other faction and every other way of gaining one.
 *
 * An `onGainControl` hook of a passive ability: it runs for each planet newly gained, after the planet is exhausted.
 * The resource value is the printed one; only infantry are counted.
 */
import type { Ability } from '../../../../game/abilities/types';
import { place } from '../../../../game/abilities/emit';

export const id = 'ability:liberate';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'passive',
  rule: id,
  holder: 'anyone',
  on: {
    onGainControl: (ctx, got) => {
      const resources = ctx.pack.planets[got.planetId]?.resources ?? 0;
      const here = ctx.my.unitsOn(got.planetId);
      if ((here.infantry ?? 0) >= resources) return [{ type: 'PlanetReadied', player: ctx.holder, planet: got.planetId }];
      return [place.units(ctx.holder, { planet: got.planetId }, { infantry: 1 })];
    },
  },
};
