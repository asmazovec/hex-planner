/**
 * Hecatoncheires (Titans of Ul, mech): "DEPLOY: When you would place a PDS on a planet, you may place 1 mech and 1
 * infantry on that planet instead."
 *
 * Decided: `passive` waiver. Construction's secondary places a structure and the replay warns of units it places
 * (`constructionUnits`); for the Titans one mech and one infantry instead of each PDS is what the card allows, so the
 * check is lifted when the units are mechs and infantry one for one, and nothing else.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:titans_mech';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{
    code: 'constructionUnits',
    rule: 'When you would place a PDS on a planet, you may place 1 mech and 1 infantry on that planet instead.',
    // One mech and one infantry for each PDS, and nothing else.
    when: (_warning, ctx) => {
      const units = ctx.entry && 'effects' in ctx.entry ? ctx.entry.effects?.production?.units : undefined;
      if (!units) return false;
      const kinds = Object.values(units).filter(n => Number(n) > 0);
      return kinds.length === 2 && (units.mech ?? 0) > 0 && units.mech === units.infantry;
    },
  }],
};
