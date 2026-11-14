/**
 * Xxekir Grom, Planetary Defense Nexus (Xxcha, hero, Thunder's Edge): "ACTION: Place any combination of up to 4 PDS or
 * mechs onto planets you control; ready each planet that you place a unit on. Then, purge this card."
 *
 * Decided: `play`. Its component action names the placements in `choices` as `'<unit>@<planet>': count` (`pds` or
 * `mech`); each unit is placed from the reinforcements and each planet it goes on is readied (the replay purges the
 * hero). The structure rules still hold (on a planet the player controls, 2 PDS a planet), and more than 4 units is
 * warned of with a new code. Rulings: a readied planet may take units, several on one planet.
 */
import placeNotControlled from '../../../rules/codes/placeNotControlled';
import placementOverLimit from '../../../rules/codes/placementOverLimit';
import { violation } from '../../../rules/registry';
import { placeUnits, planet, structures } from '../../../../game/abilities/emit';
import type { GameEvent } from '../../../../game/events';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:xxchahero-te';

/** The most units the hero places. */
const LIMIT = 4;
/** Most PDS a planet holds (85.5). */
const PDS_PER_PLANET = 2;

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    if (!ctx.held || ctx.my.faction !== 'xxcha') return [];
    const placements = Object.entries(ctx.choices).flatMap(([key, count]) => {
      const [unit, planetId] = key.split('@');
      return (unit === 'pds' || unit === 'mech') && planetId && Number(count) > 0 ? [{ unit, planetId, count: Number(count) }] : [];
    });
    const total = placements.reduce((sum, placement) => sum + placement.count, 0);
    if (total > LIMIT) ctx.warn(violation(placementOverLimit.code, { count: total, limit: LIMIT }));
    const standing = new Map<string, number>(ctx.my.planets().map(each => [each.id, each.structures.pds ?? 0]));
    const readied = new Set<string>(ctx.my.planets().filter(each => each.exhausted).map(each => each.id));
    return placements.flatMap(({ unit, planetId, count }) => {
      const events: GameEvent[] = [];
      if (unit === 'pds') {
        if (ctx.board.planets[planetId]?.owner !== ctx.holder) ctx.warn(violation('structureNotControlled', { planetId }));
        const had = standing.get(planetId) ?? 0;
        if (had + count > PDS_PER_PLANET) ctx.warn(violation('structureLimit', { kind: 'pds', planetId, count: PDS_PER_PLANET }));
        standing.set(planetId, had + count);
        events.push(structures.place(ctx.holder, planetId, { pds: count }));
      } else {
        if (ctx.board.planets[planetId]?.owner !== ctx.holder) ctx.warn(violation(placeNotControlled.code, { planetId }, 'component'));
        events.push(placeUnits(ctx.holder, { planet: planetId }, { mech: count }));
      }
      // Each planet a unit is placed on is readied.
      if (readied.delete(planetId)) events.push(planet.ready(ctx.holder, planetId));
      return events;
    });
  },
};
