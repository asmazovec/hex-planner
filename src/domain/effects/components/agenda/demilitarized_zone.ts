/**
 * Demilitarized Zone (agenda):
 * "Attach this card to the elected planet's card. Then, destroy all units on that planet. Player's units cannot
 * land, be produced, or be placed on this planet."
 *
 * A law attached to the elected planet. It forbids what the rules allow: no unit lands, is produced or is
 * placed there. The replay is to warn of it for everyone with a new code (`planetClosed`) at the landing, the
 * production and the placing of structures; nothing lifts it. When resolved, every unit on the planet is destroyed.
 * Pass 1: still the hint it is today.
 */
import planetClosed from '../../../rules/codes/planetClosed';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:demilitarized_zone';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // "Then, destroy all units on that planet": once, when the law is resolved, for every player.
  gained: ({ choices, states, shared }) => {
    const planet = String(choices.elect ?? '');
    const everyone = new Set([...Object.values(states), shared, ...Object.values(shared.rivals ?? {})]);
    for (const who of everyone) {
      delete who.ground[planet];
      delete who.pds[planet];
      who.docks = who.docks.filter(dock => dock !== planet);
    }
  },
  // "Player's units cannot land, be produced, or be placed on this planet": the replay allows all three, so the law adds the check.
  restrict: ({ entry, shared, warnings }) => {
    const closed = Object.entries(shared.attachments ?? {}).filter(([, cards]) => cards.includes(id)).map(([planet]) => planet);
    if (closed.length === 0) return;
    const named = new Set<string>();
    if (entry.type === 'tactical') {
      for (const landing of entry.landings) if (Object.keys(landing.units).length + Object.keys(landing.structures ?? {}).length > 0) named.add(landing.planetId);
      for (const [planet, units] of Object.entries(entry.productionGround ?? {})) if (Object.values(units).some(count => count)) named.add(planet);
    }
    if ('effects' in entry) for (const built of entry.effects?.structures ?? []) named.add(built.planetId);
    for (const planetId of closed) if (named.has(planetId)) warnings.push(violation(planetClosed.code, { planetId }));
  },
};
