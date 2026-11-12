/**
 * Specialist Compounds (Universities of Jol-Nar, breakthrough, Thunder's Edge): "When you research technology using the
 * 'Technology' strategy card, you may exhaust a planet that has a technology specialty instead of spending resources;
 * if you do, you must research a technology of that color."
 *
 * Decided: a passive waiver of `shortResources` on the payment of the Technology card. The warning is lifted when the
 * payment exhausts a planet with a technology specialty and every technology researched has that color; a unit upgrade
 * has none, so it is never covered (tirules2, Jol-Nar, Specialized Compounds 1, 2). The breakthrough is in force once
 * held. Its synergy ability is not in the pack's text and is not modelled.

 */
import { colourOf } from '../../../replay/research';
import { CARD } from '../../../strategy';
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:jolnarbt';

const RULE = 'you may exhaust a planet that has a technology specialty instead of spending resources; if you do, you must research a technology of that color';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{
    code: 'shortResources',
    rule: RULE,
    when: (_warning, { entry, pack }) => {
      if (entry?.type !== 'strategic' && entry?.type !== 'secondary') return false;
      if (entry.card !== CARD.technology) return false;
      const researched = entry.effects?.researched ?? [];
      const colours = researched.map(tech => colourOf(pack, tech));
      if (!colours.length || colours.includes(null)) return false;
      const paying = entry.effects?.payment?.planets ?? [];
      return paying.some(planet => colours.every(colour => pack.planets[planet]?.tech?.includes(colour!)));
    },
  }],
};
