import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { legendarySummary } from '../src/data/legendarySummaries';
import { sheetSummary } from '../src/data/sheetSummaries';
import { shipSummary } from '../src/data/shipSummaries';
import { techSummary } from '../src/data/techSummaries';
import { loadPack } from '../src/data/loadPack';
import { SOURCE_CACHE } from './build-data';

// Own retellings must not repeat the source. The source text is read from the build's cached copy and never stored in the repo.
const PLANETS = join(SOURCE_CACHE, 'planets');
const UNITS = join(SOURCE_CACHE, 'data/units');
if (!existsSync(PLANETS) || !existsSync(UNITS)) console.warn(`source wording test SKIPPED: no source copy in ${SOURCE_CACHE}. Run: npx tsx scripts/build-data.ts (it downloads the copy).`);

const RUN = 6;
const words = (text: string): string[] => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

/** Every run of `RUN` words the retelling shares with the source text. */
function sharedRuns(retelling: string, source: string): string[] {
  const original = words(source);
  const own = words(retelling);
  const runs = new Set<string>();
  for (let i = 0; i + RUN <= original.length; i += 1) runs.add(original.slice(i, i + RUN).join(' '));
  const shared: string[] = [];
  for (let i = 0; i + RUN <= own.length; i += 1) {
    const run = own.slice(i, i + RUN).join(' ');
    if (runs.has(run)) shared.push(run);
  }
  return shared;
}

test('the helper finds a shared run of 6 words and ignores a shorter one, case and punctuation', () => {
  expect(sharedRuns('Now: one two three, four five SIX later', 'x one two three four five six y')).toEqual(['one two three four five six']);
  expect(sharedRuns('one two three four five', 'one two three four five six')).toEqual([]);
});

test.skipIf(!existsSync(PLANETS))('no legendary planet retelling shares a run of 6 words with the source', () => {
  const sources = readdirSync(PLANETS).map(file => JSON.parse(readFileSync(join(PLANETS, file), 'utf8')) as { legendaryAbilityName?: string; legendaryAbilityText?: string });
  let checked = 0;
  const shared: string[] = [];
  for (const planet of sources) {
    if (!planet.legendaryAbilityName || !planet.legendaryAbilityText) continue;
    const retelling = legendarySummary(planet.legendaryAbilityName, 'en');
    if (!retelling) continue;
    checked += 1;
    shared.push(...sharedRuns(retelling, planet.legendaryAbilityText).map(run => `${planet.legendaryAbilityName}: ${run}`));
  }
  expect(shared).toEqual([]);
  expect(checked).toBeGreaterThanOrEqual(15);
});

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
    shared.push(...sharedRuns(retelling ?? '', ship.ability ?? '').map(run => `${ship.id}: ${run}`));
  }
  expect(shared).toEqual([]);
  expect(ships.length).toBeGreaterThanOrEqual(40);
});

const SOURCE_DATA = join(SOURCE_CACHE, 'data');
const LEADERS = join(SOURCE_DATA, 'leaders/te_leaders.json');

test.skipIf(!existsSync(LEADERS))('every ability, leader, mech and breakthrough has a retelling in both languages, sharing no run of 6 words with the source', () => {
  const read = <T>(path: string) => JSON.parse(readFileSync(join(SOURCE_DATA, path), 'utf8')) as T;
  const texts = new Map<string, string>();
  for (const a of readdirSync(join(SOURCE_DATA, 'abilities')).flatMap(file => read<{ id: string; source: string; permanentEffect?: string; window?: string; windowEffect?: string }[]>(`abilities/${file}`))) {
    if (/^(base|pok|thunders_edge|codex\d*)$/.test(a.source)) texts.set(a.id, [a.permanentEffect, a.window, a.windowEffect].join(' '));
  }
  for (const l of ['pok', 'te_leaders', 'other', 'generic'].flatMap(file => read<{ id: string; abilityWindow?: string; abilityText?: string }[]>(`leaders/${file}.json`))) texts.set(l.id, [l.abilityWindow, l.abilityText].join(' '));
  for (const u of ['pok', 'te_units', 'keleres'].flatMap(file => read<{ id: string; ability?: string }[]>(`units/${file}.json`))) if (u.ability) texts.set(u.id, u.ability);
  for (const b of read<{ alias: string; text: string }[]>('breakthroughs/te_breakthroughs.json')) texts.set(b.alias, b.text);
  const shared: string[] = [];
  const missing: string[] = [];
  for (const faction of Object.values(loadPack(['pok', 'te']).factions)) {
    const sheet = faction.sheet!;
    for (const { id } of [...sheet.abilities, ...sheet.leaders, ...sheet.mechs, ...(sheet.breakthrough ? [sheet.breakthrough] : [])]) {
      const en = sheetSummary(id, 'en');
      const ru = sheetSummary(id, 'ru');
      if (!en?.text || !ru?.text) { missing.push(id); continue; }
      shared.push(...sharedRuns(en.text, texts.get(id) ?? '').map(run => `${id}: ${run}`));
    }
  }
  expect(missing).toEqual([]);
  expect(shared).toEqual([]);
});

const TECHNOLOGIES = join(SOURCE_DATA, 'technologies');

test.skipIf(!existsSync(TECHNOLOGIES))('no faction technology retelling shares a run of 6 words with the source', () => {
  const texts = new Map<string, string>();
  for (const file of readdirSync(TECHNOLOGIES)) {
    for (const tech of JSON.parse(readFileSync(join(TECHNOLOGIES, file), 'utf8')) as { alias: string; source: string; text?: string }[]) {
      if (/^(base|pok|thunders_edge|codex\d*)$/.test(tech.source) && tech.text) texts.set(tech.alias, tech.text);
    }
  }
  const ids = new Set(Object.values(loadPack(['pok', 'te']).factions).flatMap(faction => faction.sheet!.techs.map(tech => tech.id)));
  const shared: string[] = [];
  for (const id of ids) {
    expect(texts.has(id), id).toBe(true);
    shared.push(...sharedRuns(techSummary(id, 'en') ?? '', texts.get(id) ?? '').map(run => `${id}: ${run}`));
  }
  expect(shared).toEqual([]);
  expect(ids.size).toBeGreaterThanOrEqual(60);
});
