/**
 * G'hom Sek'kus (Sardakk N'orr, commander): "During the "Commit Ground Forces" step: You can commit (move) up to 1
 * ground force from each planet in the active system and each planet in adjacent systems that do not contain 1 of
 * your command tokens."
 *
 * Decided: a passive waiver of a new check. LRR 49.2 commits only the ground forces in the space area of the active
 * system; a landing whose ground force comes from a planet (`from`, a new field of a landing) is warned of for everyone
 * (`landingFromPlanet`, 49.2, step invasion), and the unlocked commander lifts it for at most one ground force from
 * each planet of the active system or of an adjacent system without one of the player's command tokens. No ship is
 * needed in the active system (tirules2, Sardakk N'orr, G'hom Sek'kus 2).

 */
import landingFromPlanet from '../../../rules/codes/landingFromPlanet';
import type { UnitId } from '../../../types';
import { adjacentTo } from '../../../movement';
import { systemOfPlanet } from '../../../stacks';
import type { ComponentEffect } from '../../types';

export const id = 'leader:sardakkcommander';

const RULE = 'You can commit (move) up to 1 ground force from each planet in the active system and each planet in adjacent systems that do not contain 1 of your command tokens.';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // The landing block offers the ground forces of the planets around the active system.
  landingOffer: { fromPlanets: true },
  waive: [{
    code: landingFromPlanet.code,
    rule: RULE,
    when: (warning, { entry, game, pack, before }) => {
      if (entry?.type !== 'tactical' || entry.systemId === null) return false;
      const from = String(warning.params.from);
      const slot = systemOfPlanet(game, from, pack);
      if (slot === undefined) return false;
      if (slot !== entry.systemId && (before.tokensOnMap.includes(slot) || !adjacentTo(game, entry.systemId, pack).includes(slot))) return false;
      // One ground force from each planet in all: the entry's landings from this planet together.
      const committed = entry.landings.filter(landing => landing.from === from)
        .reduce((sum, landing) => sum + Object.entries(landing.units).reduce((n, [unit, count]) => n + (pack.units[unit as UnitId]?.ground ? (count ?? 0) : 0), 0), 0);
      return committed <= 1;
    },
  }],
};
