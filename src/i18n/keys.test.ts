import { describe, expect, test } from 'vitest';
import en from './en.json';
import ru from './ru.json';

const flat = (node: object, prefix = ''): string[] => Object.entries(node).flatMap(([key, value]) =>
  (typeof value === 'object' && value !== null ? flat(value as object, `${prefix}${key}.`) : [`${prefix}${key}`]));

const sources = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.*'], { query: '?raw', import: 'default', eager: true });

/** Every key written out in the code: a key put together at run time is out of reach of this check. */
const usedKeys = [...new Set(Object.values(sources).flatMap(text => [...text.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'/g)].map(match => match[1])))];

describe.each([['en', en], ['ru', ru]] as const)('the %s texts', (_, texts) => {
  const keys = flat(texts);
  const has = (key: string) => keys.some(known => known === key || known.startsWith(`${key}_`));

  test('hold every key the code asks for', () => {
    expect(usedKeys.length).toBeGreaterThan(100);
    expect(usedKeys.filter(key => !has(key))).toEqual([]);
  });

  test('hold a key per key of the other language, plural forms aside', () => {
    const base = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '');
    const other = new Set(flat(texts === en ? ru : en).map(base));
    expect(keys.map(base).filter(key => !other.has(key))).toEqual([]);
  });
});
