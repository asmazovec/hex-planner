/**
 * A warning is shown in the row and the editor of whoever's turn it is, the shown player's or another's: its text
 * names nobody as «you». Every text of a warning, of the core codes (src/i18n) and of the codes in files of their own,
 * is neutral in both languages.
 */
import { describe, expect, test } from 'vitest';
import en from '../../i18n/en.json';
import ru from '../../i18n/ru.json';
import { EXTENSION_CODES } from './codes';

const YOU_EN = /\b(you|your|yours|yourself)\b/i;
const YOU_RU = /(^|[^а-яё])(вы|вас|вам|вами|ваш[а-яё]*)(?![а-яё])/i;

function texts(node: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object') for (const [key, value] of Object.entries(node)) texts(value, `${path}.${key}`, out);
  return out;
}

describe('the texts of warnings name no one as «you»', () => {
  test('the core codes, English and Russian', () => {
    expect(texts(en.plan.warning, 'en').filter(([, text]) => YOU_EN.test(text)).map(([key]) => key)).toEqual([]);
    expect(texts(ru.plan.warning, 'ru').filter(([, text]) => YOU_RU.test(text)).map(([key]) => key)).toEqual([]);
  });

  test('the codes in files of their own', () => {
    const defs = [...EXTENSION_CODES.values()];
    expect(defs.length).toBeGreaterThan(30);
    expect(defs.filter(def => YOU_EN.test(def.text.en)).map(def => def.code)).toEqual([]);
    expect(defs.filter(def => YOU_RU.test(def.text.ru)).map(def => def.code)).toEqual([]);
  });
});
