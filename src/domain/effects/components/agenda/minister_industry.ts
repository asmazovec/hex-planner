/**
 * Minister of Industry (agenda): "The elected player gains this card. When the owner of this card places a space
 * dock in a system, their units in that system may use their PRODUCTION abilities."
 *
 * A waiver of a new check: units produce only by a PRODUCTION ability in a tactical action or where a card says so
 * (67.1); Construction places a space dock (4.2/85.2) and produces nothing. With this law the owner's units in the
 * system of the dock just placed may produce, against their PRODUCTION value.
 */
import productionNotAllowed from '../../../rules/codes/productionNotAllowed';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:minister_industry';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{
    code: productionNotAllowed.code,
    rule: 'their units in that system may use their PRODUCTION abilities',
    when: (warning, ctx) => {
      const docks = ctx.entry && 'effects' in ctx.entry ? ctx.entry.effects?.structures?.filter(s => s.kind === 'spacedock') ?? [] : [];
      return docks.some(dock => ctx.systemOf(dock.planetId) === warning.params.systemId);
    },
  }],
};
