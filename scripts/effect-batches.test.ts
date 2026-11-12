import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { loadPack } from '../src/data/loadPack';
import { componentsOf } from '../src/domain/components';
import { BATCH_SIZE, batchesOf, OUT, renderIndex, statusOf, type Batch } from './effect-batches';

const pack = loadPack(['pok', 'te']);
const batches = batchesOf(pack);
const written: Batch[] = readdirSync(OUT).filter(file => /^\d+\.json$/.test(file)).sort().map(file => JSON.parse(readFileSync(`${OUT}/${file}`, 'utf8')) as Batch);

describe('the batches of component effects', () => {
  test('cover the catalogue exactly once', () => {
    const ids = batches.flatMap(batch => batch.components.map(component => component.id));
    expect(ids).toHaveLength(697);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(componentsOf(pack).map(component => component.id).sort());
  });

  test('keep a faction whole in one batch, the three sheets of Keleres as one, and never mix a faction with the common components', () => {
    const batchOf = new Map<string, number>();
    for (const batch of batches) {
      for (const component of batch.components) {
        if (component.faction === undefined) continue;
        const faction = component.faction.startsWith('keleres') ? 'keleres' : component.faction;
        expect(batchOf.get(faction) ?? batch.batch, component.id).toBe(batch.batch);
        batchOf.set(faction, batch.batch);
      }
      const owned = batch.components.filter(component => component.faction !== undefined).length;
      expect(owned === 0 || owned === batch.components.length, batch.title).toBe(true);
    }
    expect(batchOf.size).toBe(31);
  });

  test('are about twenty components each: a common batch never more, two factions at most a few more', () => {
    for (const batch of batches) {
      expect(batch.components.length, batch.title).toBeGreaterThan(0);
      expect(batch.components.length, batch.title).toBeLessThanOrEqual(batch.title.startsWith('Common') ? BATCH_SIZE : BATCH_SIZE + 6);
    }
    expect(batches.length).toBeGreaterThanOrEqual(33);
    expect(batches.length).toBeLessThanOrEqual(36);
  });

  test('are the same on every run, and the files in docs/phase4/batches are those of the data as it is', () => {
    expect(batchesOf(pack)).toEqual(batches);
    expect(written).toEqual(batches);
    expect(readFileSync(`${OUT}/README.md`, 'utf8')).toBe(renderIndex(batches));
  });

  test('know the exemplars as written: the status is read from the files of the components', () => {
    for (const file of ['ability/armada', 'ability/miniaturization', 'mech/argent_mech', 'leader/letnevhero']) expect(statusOf(file), file).toBe('written');
    expect(statusOf('ability/nothing_of_the_kind')).toBe('none');
  });
});
