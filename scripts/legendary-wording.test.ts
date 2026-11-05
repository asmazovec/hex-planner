import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { legendarySummary } from '../src/data/legendarySummaries';

// The source text is read from the build's cached copy and never stored in the repo.
const SOURCE = join(tmpdir(), 'ti4-source-9eee64a3b13fc698b3ee174590dde40e005c0dfe', 'planets');
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
