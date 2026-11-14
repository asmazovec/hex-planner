/** LRR 35 Exploration. Source: tirules2 rules-reference/exploration.md. */
import { describe, expect, test } from 'vitest';
import { componentById } from '../../components';
import { emptyHoldings } from '../../holdings';
import { holds } from '../../replay/holdings';
import { lose } from '../../../testing/old/domain/replay/holdings';
import { rulesPack } from '../kit';
import { loadPack } from '../../../data/loadPack';
import { MECATOL_PLANET } from '../../mecatol';
import { gain } from '../../../testing/old/domain/replay/holdings';

const base = loadPack([]);
const homePlanets = Object.values(base.factions).flatMap(f => base.tiles[f.homeTile]?.planetIds ?? []);

describe('LRR 35 Exploration', () => {
  test.todo('35.1: gaining a planet no one controlled explores it — not modelled: exploration is not planned');
  test.todo('35.2: exploring draws a card of the deck of the planet\'s trait — not modelled: exploration is not planned');

  test('35.2.1: the planet traits are cultural, hazardous and industrial', () => {
    const traits = new Set(Object.values(base.planets).flatMap(p => p.traits ?? []));
    expect([...traits].sort()).toEqual(['cultural', 'hazardous', 'industrial']);
  });

  test('35.2.2: Mecatol Rex and the planets of home systems have no trait, so they cannot be explored', () => {
    expect(base.planets[MECATOL_PLANET]?.traits).toBeUndefined();
    expect(homePlanets.length).toBeGreaterThan(0);
    for (const id of homePlanets) expect(base.planets[id]?.traits, id).toBeUndefined();
  });

  test.todo('35.2.3: a planet with several traits lets the explorer pick the deck — not modelled: exploration is not planned');
  test.todo('35.2.4: several explorations at once resolve one by one in the player\'s order — not modelled: exploration is not planned');
  test.todo('35.3: some abilities explore a planet more than once — not modelled: exploration is not planned');
  test.todo('35.4: frontier tokens are explored with Dark Energy Tap or another effect — not modelled: frontier tokens are not on the map');
  test.todo('35.4.1: frontier tokens are placed at setup and by abilities — not modelled: frontier tokens are not on the map');
  test.todo('35.5: exploring a frontier token draws from the frontier deck — not modelled: frontier tokens are not on the map');
  test.todo('35.6: an explored frontier token is discarded — not modelled: frontier tokens are not on the map');
  test.todo('35.7: an exploration card resolves and is discarded unless it is a fragment or an attachment — not modelled: exploration is not planned');
  test.todo('35.7.1: an empty exploration deck is reshuffled from its discards — not modelled: no decks');
  test.todo('35.8: an attach card goes on the explored planet\'s card — not modelled: attachments are not in the data');
  test.todo('35.9.1: relic fragments are resolved to draw relics — not modelled: relics are not planned');
  test.todo('35 note 1: a card that purges itself is not discarded — not modelled: exploration is not planned');
  test.todo('35 note 2: Enigmatic Device and Ion Storm go into play — not modelled: exploration is not planned');
  test.todo('35 note 3: several planets gained in a system are gained and explored one at a time — not modelled: exploration is not planned');
  test.todo('35 note 4: transactions may happen between revealing and resolving a card — not modelled: transactions are not planned');
  test.todo('35 note 5: an exploration card is shown to all before it resolves — not modelled: exploration is not planned');
  test.todo('35 note 6: notes on particular cards live on their own page — not modelled: exploration is not planned');
});

// The condition of a card that asks for a mech or an infantry (explorationCondition) is tested through the cards that ask it:
// src/domain/effects/components/exploration/exp1.test.ts, cm1.test.ts and vfs1.test.ts.

describe('LRR 35.9 relic fragments are kept in the play area (Holdings.found)', () => {
  const pack = rulesPack(undefined, ['pok']);
  const state = () => ({ holdings: emptyHoldings() }) as Parameters<typeof gain>[0];
  test('35.9: a fragment explored stays with the player, one copy for each found, and one copy leaves when it is purged', () => {
    const own = state();
    const fragment = componentById(pack, 'exploration:crf1')!;
    gain(own, own, fragment);
    gain(own, own, fragment);
    expect(own.holdings.found).toEqual(['exploration:crf1', 'exploration:crf1']);
    lose(own, own, fragment);
    expect(own.holdings.found).toEqual(['exploration:crf1']);
    expect(holds(own.holdings, fragment)).toBe(true);
  });
  test('35.7: a card that attaches or is resolved at once is held by no one, and needs no holding to be played', () => {
    const own = state();
    const attach = componentById(pack, 'exploration:pw')!;
    gain(own, own, attach);
    expect(own.holdings.found).toEqual([]);
    expect(holds(own.holdings, attach)).toBe(true);
  });
  test('35 note 2: Enigmatic Device goes into the play area', () => {
    const own = state();
    gain(own, own, componentById(pack, 'exploration:ed1')!);
    expect(own.holdings.found).toEqual(['exploration:ed1']);
  });
});
