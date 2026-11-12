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
import { placeOnPlanet } from '../../../replay/invasion';
import { homePlanets } from '../../../strategy';
import '../../points/moments';
import '../../points/production';
import type { ComponentEffect } from '../../types';

export const id = 'ability:mitosis';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // A dock of the Arborec builds no infantry (68.1 note 4).
  modify: { dockInfantry: () => 0 },
  // Mandatory while the Arborec control a planet (Arborec note 3); which planet is theirs to choose: the home planets come first.
  onStatusStart: ({ game, state, pack, warnings, entry }) => {
    // Letani Behemoth, named in the status entry, replaces an infantry "instead" (Arborec mech DEPLOY): nothing is placed.
    if (entry?.uses?.includes('mech:arborec_mech')) return;
    const home = homePlanets(game, pack);
    const mine = Object.keys(state.control).filter(planetId => state.control[planetId] === 'me');
    const planetId = [...mine].sort((a, b) => Number(!home.includes(a)) - Number(!home.includes(b)))[0];
    if (planetId !== undefined) placeOnPlanet(state, planetId, { infantry: 1 }, warnings, 'status');
  },
};
