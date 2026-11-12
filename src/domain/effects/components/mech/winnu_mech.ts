/**
 * Reclaimer (Winnu, mech): "After you resolve a tactical action where you gained control of this planet, you may place
 * 1 PDS or 1 Space Dock from your reinforcements on this planet."
 *
 * Decided: a `passive` waiver, as Reclamation's. A structure the landing puts on a planet that no flight brought is
 * warned of as missing from the space area (`unitsMissing`, invasion step); it is lifted for one structure on a planet
 * the action gained, where a Reclaimer stands at the end of the action (ruling 4), one per Reclaimer (ruling 3).
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:winnu_mech';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{
    code: 'unitsMissing',
    rule: 'you may place 1 PDS or 1 Space Dock from your reinforcements on this planet',
    // One structure per Reclaimer standing on the planet at the end of an action that gained it.
    when: ({ params, step }, { entry, before, after }) => {
      const planetId = String(params.planetId ?? '');
      if (step !== 'invasion' || !planetId || (params.unit !== 'pds' && params.unit !== 'spacedock')) return false;
      if (before.control[planetId] === 'me' || after.control[planetId] !== 'me') return false;
      const placed = entry?.type === 'tactical'
        ? entry.landings.filter(landing => landing.planetId === planetId).reduce((sum, landing) => sum + (landing.structures?.pds ?? 0) + (landing.structures?.spacedock ?? 0), 0)
        : 0;
      return placed <= (after.ground[planetId]?.mech ?? 0);
    },
  }],
};
