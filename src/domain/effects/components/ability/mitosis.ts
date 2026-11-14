/**
 * Mitosis (Arborec): "Your space docks cannot produce infantry. At the start of the status phase: Place 1 infantry from
 * your reinforcements on any planet you control."
 *
 * Pass 1: a hint as it is today. Pass 2 makes it passive with two changes of the count, both numbers: the infantry a
 * space dock may produce (none for the Arborec, LRR 68.1 note 4: "Production value from Arborec space docks cannot be
 * used to produce infantry"), checked by the production step for everyone; and the infantry placed at the start of
 * the status phase (one; mandatory while the Arborec control a planet, Arborec note 3). A Letani Behemoth may still be
 * produced by a dock (note 2).
 */
import { place } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import '../../points/production';

export const id = 'ability:mitosis';

/** The infantry placed at the start of the status phase is a hook of the kernel; the dock's limit (`modify`) is still written for the old state. */
export const ability: Ability = {
  tier: 'passive',
  rule: id,
  // A dock of the Arborec builds no infantry (68.1 note 4).
  modify: { dockInfantry: () => 0 },
  holder: 'anyone',
  on: {
    // Mandatory while the Arborec control a planet (Arborec note 3); which planet is theirs to choose: the home planets come first.
    onStatusStart: ctx => {
      // Letani Behemoth, named in the status entry, replaces an infantry "instead" (Arborec mech DEPLOY): nothing is placed.
      if (ctx.entry?.uses?.includes('mech:arborec_mech')) return;
      const home = ctx.home(ctx.holder);
      const mine = ctx.my.planets().map(planet => planet.id);
      const planet = [...mine].sort((a, b) => Number(!home.includes(a)) - Number(!home.includes(b)))[0];
      return planet === undefined ? undefined : [place.units(ctx.holder, { planet }, { infantry: 1 })];
    },
  },
};
