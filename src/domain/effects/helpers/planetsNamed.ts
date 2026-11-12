import type { Entry } from '../../types';

/**
 * The planets an entry puts units on: those it lands on, those it builds ground forces for and those it builds
 * structures on. What a card that closes a planet to units checks (Demilitarized Zone).
 */
export function planetsNamed(entry: Entry): Set<string> {
  const named = new Set<string>();
  if (entry.type === 'tactical') {
    for (const landing of entry.landings) if (Object.keys(landing.units).length + Object.keys(landing.structures ?? {}).length > 0) named.add(landing.planetId);
    for (const [planet, units] of Object.entries(entry.productionGround ?? {})) if (Object.values(units).some(count => count)) named.add(planet);
  }
  if ('effects' in entry) for (const built of entry.effects?.structures ?? []) named.add(built.planetId);
  return named;
}
