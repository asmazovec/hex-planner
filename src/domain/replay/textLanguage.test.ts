import { afterAll, describe, expect, test } from 'vitest';
import { loadPack, setTextLanguage } from '../../data/loadPack';
import { componentsOf } from '../components';
import { emptyHoldings } from '../holdings';
import type { GameState, Warning } from '../types';
import { playComponent } from './holdings';

afterAll(() => setTextLanguage('en'));

/** The shown text is a translation in Russian: the replay must read the printed English, so both languages replay alike. */
describe('the interface language does not change the replay', () => {
  const en = loadPack(['pok', 'te'], 'en');
  const ru = loadPack(['pok', 'te'], 'ru');

  test('every component, played from a hand that holds all of them, leaves the same holdings in en and ru', () => {
    const played = (pack: typeof en, id: string) => {
      const own = { holdings: emptyHoldings() } as unknown as GameState;
      const back = { holdings: emptyHoldings() } as unknown as GameState;
      const h = own.holdings;
      h.promissory.push(id); h.relics.push(id); h.found.push(id); h.technologies.push(id); h.hand.push(id); h.breakthrough = 'held';
      const warnings: Warning[] = [];
      playComponent(own, id, 'me', pack, warnings, '', { o1: back });
      return { own: own.holdings, back: back.holdings, warnings: warnings.map(w => w.code) };
    };
    for (const def of componentsOf(en)) expect(played(ru, def.id), def.id).toEqual(played(en, def.id));
  });

  test('a relic whose printed text purges it is gone in Russian too', () => {
    const own = { holdings: emptyHoldings() } as unknown as GameState;
    own.holdings.relics.push('relic:dominusorb');
    playComponent(own, 'relic:dominusorb', 'me', ru, [], '', {});
    expect(own.holdings.relics).toEqual([]);
  });
});
