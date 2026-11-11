import { expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { searchComponents } from './useComponentSearch';

const english = loadPack(['pok'], 'en');
const russian = loadPack(['pok'], 'ru');
const ids = (found: { id: string }[]) => found.map(c => c.id);

test('each language has its own pack, and so its own index', () => {
  expect(russian).not.toBe(english);
  expect(russian.texts['relic:shard']).toMatch(/[а-яё]/i);
  expect(english.texts['relic:shard']).not.toMatch(/[а-яё]/i);
});

test('with Russian texts a component is found by its Russian text and by its English name', () => {
  expect(ids(searchComponents(russian, 'победное очко легендарной'))).toContain('relic:shard');
  expect(ids(searchComponents(russian, 'shard of the throne')).slice(0, 2)).toContain('relic:shard');
  expect(ids(searchComponents(russian, 'sabotge'))[0]).toMatch(/^actionCard:sabo/);
  expect(searchComponents(russian, 'shard of the throne').find(c => c.id === 'relic:shard')!.name).toBe('Shard of the Throne');
});

test('with English texts the same component is found by its English text, and the Russian text finds nothing of it', () => {
  expect(ids(searchComponents(english, 'gain victory point legendary'))).toContain('relic:shard');
  expect(ids(searchComponents(english, 'победное очко легендарной'))).not.toContain('relic:shard');
});

test('the index follows the pack: one search after another over the two packs does not mix them', () => {
  expect(ids(searchComponents(english, 'победное очко легендарной'))).not.toContain('relic:shard');
  expect(ids(searchComponents(russian, 'победное очко легендарной'))).toContain('relic:shard');
  expect(ids(searchComponents(english, 'победное очко легендарной'))).not.toContain('relic:shard');
});
