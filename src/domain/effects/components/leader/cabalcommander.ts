/**
 * That Which Molds Flesh (Vuil'raith Cabal, commander): "When you produce fighter or infantry units: Up to 2 of those
 * units do not count against your PRODUCTION limit."
 *
 * Decided: `passive` waiver of `productionOver`, narrowed with `when`: the production without up to 2 of its fighters
 * and infantry must fit the value. It is a waiver and not a modify: the limit stays, fewer units are counted against it.
 * */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:cabalcommander';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{
    code: 'productionOver',
    rule: 'Up to 2 of those units do not count against your PRODUCTION limit.',
    // Up to 2 of the fighters and infantry are left out of the count; what remains must fit.
    when: (warning, ctx) => {
      const units = ctx.entry?.type === 'tactical' ? ctx.entry.production : undefined;
      if (!units) return false;
      const left = Math.min(2, (units.fighter ?? 0) + (units.infantry ?? 0));
      return Number(warning.params.count) - left <= Number(warning.params.value);
    },
  }],
};
