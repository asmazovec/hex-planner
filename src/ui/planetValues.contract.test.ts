import { expect, test } from 'vitest';

const sources = import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./**/*.test.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** These take the values from the domain first and fall back to the printed ones (the home hex sheet of a faction is printed by nature). */
const PRINTED_ALLOWED = ['players/FactionCard.tsx', 'map/TileView.tsx', 'map/stage/PlanetDetails.tsx'];

// A planet of the player's is worth what the components make of it (`shownPlanetValues`), so the screens never read
// `planet.resources` / `planet.influence` of the pack for it.
test('the ui reads a planet\'s resources and influence only through the domain, with the printed ones as a fallback', () => {
  expect(Object.keys(sources).length).toBeGreaterThan(50);
  const offenders = Object.entries(sources)
    .filter(([file]) => !PRINTED_ALLOWED.some(allowed => file.endsWith(allowed)))
    .filter(([, text]) => /\bplanet\.(resources|influence)\b/.test(text))
    .map(([file]) => file);
  expect(offenders).toEqual([]);
});
