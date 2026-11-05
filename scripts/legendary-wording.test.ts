import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { legendarySummary } from '../src/data/legendarySummaries';
import { shipSummary } from '../src/data/shipSummaries';
import { SOURCE_CACHE } from './build-data';

// The source text is read from the build's cached copy and never stored in the repo.
const SOURCE = join(SOURCE_CACHE, 'planets');
if (!existsSync(SOURCE)) console.warn(`legendary wording test SKIPPED: no source copy in ${SOURCE}. Run: npx tsx scripts/build-data.ts (it downloads the copy).`);
const words = (text: string): string[] => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

test.skipIf(!existsSync(SOURCE))('no retelling shares a run of 6 words with the source text', () => {
  const sources = readdirSync(SOURCE).map(file => JSON.parse(readFileSync(join(SOURCE, file), 'utf8')) as { legendaryAbilityName?: string; legendaryAbilityText?: string });
  let checked = 0;
  const shared: string[] = [];
  for (const planet of sources) {
    if (!planet.legendaryAbilityName || !planet.legendaryAbilityText) continue;
    const retelling = legendarySummary(planet.legendaryAbilityName, 'en');
    if (!retelling) continue;
    checked += 1;
    const original = words(planet.legendaryAbilityText);
    const own = words(retelling);
    const runs = new Set<string>();
    for (let i = 0; i + 6 <= original.length; i += 1) runs.add(original.slice(i, i + 6).join(' '));
    for (let i = 0; i + 6 <= own.length; i += 1) {
      if (runs.has(own.slice(i, i + 6).join(' '))) shared.push(`${planet.legendaryAbilityName}: ${own.slice(i, i + 6).join(' ')}`);
    }
  }
  expect(shared).toEqual([]);
  expect(checked).toBeGreaterThanOrEqual(15);
});

const UNITS = join(SOURCE_CACHE, 'data/units');
const SHIP_TYPES = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter'];
const THIRD_LEVEL = ['mentak_cruiser3'];

test.skipIf(!existsSync(UNITS))('every ship with an ability has its own retelling in both languages, sharing no run of 6 words with the source', () => {
  type Unit = { id: string; baseType: string; source: string; ability?: string; homebrewReplacesID?: string };
  const ships = ['baseUnits', 'pok', 'te_units', 'keleres']
    .flatMap(file => JSON.parse(readFileSync(join(UNITS, `${file}.json`), 'utf8')) as Unit[])
    .filter(unit => SHIP_TYPES.includes(unit.baseType) && /^(base|pok|thunders_edge|codex\d*)$/.test(unit.source)
      && !unit.homebrewReplacesID && !THIRD_LEVEL.includes(unit.id) && !/cavalry/.test(unit.id) && unit.ability);
  const shared: string[] = [];
  for (const ship of ships) {
    expect(shipSummary(ship.id, 'ru'), ship.id).toMatch(/[а-яё]{3}/i);
    const retelling = shipSummary(ship.id, 'en');
    expect(retelling, ship.id).toMatch(/[a-z]{3}/i);
    const original = words(ship.ability ?? '');
    const own = words(retelling ?? '');
    const runs = new Set<string>();
    for (let i = 0; i + 6 <= original.length; i += 1) runs.add(original.slice(i, i + 6).join(' '));
    for (let i = 0; i + 6 <= own.length; i += 1) {
      if (runs.has(own.slice(i, i + 6).join(' '))) shared.push(`${ship.id}: ${own.slice(i, i + 6).join(' ')}`);
    }
  }
  expect(shared).toEqual([]);
  expect(ships.length).toBeGreaterThanOrEqual(40);
});
