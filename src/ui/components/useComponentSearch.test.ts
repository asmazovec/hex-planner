import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { COMPONENT_KINDS, componentsOf } from '../../domain/components';
import type { ComponentDef, ComponentKind } from '../../domain/types';
import enStrings from '../../i18n/en.json';
import ruStrings from '../../i18n/ru.json';
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

// The words of the search stand in the domain, which has no i18n: this keeps them together with the interface.
describe('every label the interface shows finds what it labels, in Russian and in English', () => {
  const pack = loadPack(['pok', 'te'], 'ru');
  const labels = (path: string): string[] => [ruStrings, enStrings].map(json => path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], json) as string);
  /** The first results of the label, as many as there are such components, are all what it labels or hold its word in the name. */
  const finds = (path: string, is: (c: ComponentDef) => boolean, kinds?: ComponentKind[]) => {
    for (const label of labels(path)) {
      const wanted = componentsOf(pack).filter(c => is(c) && (!kinds || kinds.includes(c.kind))).length;
      expect(wanted, label).toBeGreaterThan(0);
      const head = searchComponents(pack, label, kinds).slice(0, wanted);
      const word = label.toLowerCase().split(' ')[0];
      expect(head.filter(c => !is(c) && !c.name.toLowerCase().includes(word)).map(c => c.id), `${path}: ${label}`).toEqual([]);
      expect(head.some(is), `${path}: ${label}`).toBe(true);
    }
  };

  test('the kind of a component', () => {
    for (const kind of COMPONENT_KINDS) finds(`components.kind.${kind}`, c => c.kind === kind);
  });

  test('the type of a leader', () => {
    for (const type of ['agent', 'commander', 'hero']) finds(`players.leader.${type}`, c => c.kind === 'leader' && c.detail?.type === type);
  });

  test('the colour of a technology', () => {
    for (const type of ['propulsion', 'biotic', 'cybernetic', 'warfare']) finds(`map.tech.${type}`, c => c.detail?.type === type, ['technology']);
  });

  test('the trait of an exploration card', () => {
    for (const trait of ['cultural', 'hazardous', 'industrial']) finds(`map.trait.${trait}`, c => c.detail?.trait === trait, ['exploration']);
  });

  test('the unit of an upgrade', () => {
    for (const unit of ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter', 'infantry']) {
      const upgraded = componentsOf(pack).some(c => c.kind === 'technology' && c.detail?.upgrade === unit);
      if (upgraded) finds(`unit.${unit}`, c => c.detail?.upgrade === unit, ['technology']);
    }
  });
});
