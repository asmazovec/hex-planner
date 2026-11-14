/**
 * Articles of War (agenda):
 * "For: All mechs lose their printed abilities except for SUSTAIN DAMAGE. Against: Each player that voted "For"
 * gains 3 trade goods."
 *
 * A law: while it is in play every mech loses its printed abilities except SUSTAIN DAMAGE. It lifts no check
 * of its own: it takes the mechs out of what is in force (`inForceOf`), so a waiver or a modify of a mech (Aerie
 * Sentinel's capacity) no longer holds and its warning stands again. The "Against" outcome gives trade goods by votes
 * and is entered by hand. Pass 1: still the hint it is today.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:articles_war';

export const ability: Ability = {
  tier: 'passive',
  rule: id,
  // "All mechs lose their printed abilities": no mech is in force while the law is (SUSTAIN DAMAGE is a unit's own, not a component).
  suppresses: component => component.startsWith('mech:'),
  holder: 'self',
};
