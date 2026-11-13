import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../types';
import { adjust, bench, endOf, planned, quote } from './components/kit';

const gaining = (...ids: string[]): Entry => ({ ...adjust({}), gains: ids });
const expedition = (): Entry =>
  planned({ type: 'component', note: '', acts: [{ kind: 'expedition', sliceId: 'tech', payment: { planets: [], tradeGoods: 0 } }] } as EntryBody);

describe('a breakthrough is gained like any component', () => {
  // The Quantumcore: "When you gain this card, gain your breakthrough."; Stellar Genesis: "When you gain this card, ...
  //  gain the Avernus planet card and ready it."
  // Checks: the relic gives the breakthrough through the one gain, so what the breakthrough does when gained runs.
  test('the Quantumcore gives the breakthrough and its own "when you gain this card" runs', () => {
    const table = bench({ faction: 'muaat', expansions: ['pok', 'te'], entries: [gaining('relic:quantumcore')] });
    quote(table.pack, 'relic:quantumcore', 'When you gain this card, gain your breakthrough.');
    quote(table.pack, 'breakthrough:muaatbt', 'gain the Avernus planet card and ready it');
    const end = endOf(table);
    expect(end.holdings.breakthrough).toBe('held');
    expect(end.control.avernus).toBe('me');
  });

  // Expedition note 3 (rules corpus, expedition.md): "When a player performs an expedition, they gain their faction's
  //  breakthrough if they do not already have it."
  // Checks: an expedition gives the breakthrough, once: held already, it does not run its gain again.
  test('an expedition gains the faction breakthrough when it is not held', () => {
    const table = bench({ faction: 'obsidian', expansions: ['pok', 'te'], entries: [expedition()] });
    expect(endOf(table).holdings.breakthrough).toBe('held');
  });

  test('an expedition by a player who holds the breakthrough does not gain it again', () => {
    const table = bench({ faction: 'muaat', expansions: ['pok', 'te'], start: { breakthrough: 'held' }, entries: [expedition()] });
    expect(endOf(table).control.avernus).toBeUndefined();
  });

  // Checks: an entry gains the breakthrough of a faction that shares its card (the Keleres), and its hook runs.
  test('the Keleres Argent gain I.I.H.Q. Modernization through the entry and get the Custodia Vigilia', () => {
    const table = bench({ faction: 'keleresa', expansions: ['pok', 'te'], entries: [gaining('breakthrough:keleresbt')] });
    const end = endOf(table);
    expect(end.holdings.breakthrough).toBe('held');
    expect(end.control.custodiavigilia).toBe('me');
  });

  // Checks: the breakthrough of another faction is not the player's: gaining it holds nothing and runs nothing.
  test('the breakthrough of another faction is not held by gaining it', () => {
    const table = bench({ faction: 'sol', expansions: ['pok', 'te'], entries: [gaining('breakthrough:muaatbt')] });
    const end = endOf(table);
    expect(end.holdings.breakthrough).toBeUndefined();
    expect(end.control.avernus).toBeUndefined();
  });
});
