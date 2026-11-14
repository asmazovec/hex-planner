/**
 * Imperator (Winnu, breakthrough): "Apply +1 to the results of each of your unit's combat rolls for each "Support for
 * the Throne" in your opponent's play area. After you activate a system that contains a legendary planet, apply +1 to
 * the move value of 1 of your ships during this tactical action."
 *
 * Decided: a `passive` waiver for the movement; the combat part counts nothing (no dice are rolled). A ship short of
 * its route by one system (`speedShort`, 58) is not warned of when the active system holds a legendary planet, for
 * one ship only: the +1 is given to 1 ship, so a group of two short ships, or a shortfall of two, still stands. The
 * move value point (`speed`) does not know the active system, hence a waiver narrowed with `when`.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:winnubt';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{
    code: 'speedShort',
    rule: 'After you activate a system that contains a legendary planet, apply +1 to the move value of 1 of your ships during this tactical action',
    when: (warning, ctx) => {
      const { entry } = ctx;
      return entry?.type === 'tactical' && entry.systemId !== null && ctx.planetsIn(entry.systemId).some(planetId => ctx.pack.planets[planetId]?.legendary !== undefined) && ctx.oneShipShort(warning);
    },
  }],
};
