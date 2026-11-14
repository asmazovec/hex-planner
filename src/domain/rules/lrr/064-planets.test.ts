/** LRR 64 Planets. Source: tirules2 rules-reference/planets.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { MECATOL_PLANET } from '../../mecatol';
import { CARD } from '../../strategy';
import { codesOf, forecast, HOME, rulesGame, rulesPack, secondary, tactical } from '../kit';
import { readyInfluence, readyResources } from '../../../testing/old/domain/replay/payment';

const pack = rulesPack();
const atHome = { docks: ['h1'] };
const full = loadPack(['pok']);

describe('LRR 64 Planets', () => {
  test('64.1: a planet\'s resources are its resource value: my ready planets h1 (3) and h2 (1) give 4', () => {
    expect(readyResources(forecast(rulesGame(), pack).state, pack)).toBe(4);
  });

  test('64.2: a planet\'s influence is its influence value: h1 (1) and h2 (2) give 3', () => {
    expect(readyInfluence(forecast(rulesGame(), pack).state, pack)).toBe(3);
  });

  test('64.3: planets carry the three traits only, and a trait changes no value', () => {
    const traits = new Set(Object.values(full.planets).flatMap(p => p.traits ?? []));
    expect([...traits].sort()).toEqual(['cultural', 'hazardous', 'industrial']);
  });

  test('64.4: some planets have a technology specialty', () => {
    expect(Object.values(full.planets).some(p => (p.tech ?? []).length > 0)).toBe(true);
  });

  test.todo('64.4: a specialty planet can be exhausted for a prerequisite — not modelled: research prerequisites are not checked');

  test('64.5: legendary planets are marked with the name of their ability card', () => {
    expect(full.planets.primor?.legendary).toBe('The Atrament');
    expect(full.planets.mallice?.legendary).toBeTruthy();
  });

  test.todo('64.5: gaining a legendary planet gains its ability card — not modelled: the card\'s ability is shown, not tracked');

  test('64.6: the planets a player controls are theirs: control decides whose resources a planet gives', () => {
    const { state } = forecast(rulesGame({ game: { planetControl: { t1: 'me' } } }), pack);
    expect(readyResources(state, pack)).toBe(6);
  });

  test('64.7 / 64.8: a ready planet is spent by exhausting it', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const { state } = forecast(rulesGame({ entries: [build], game: atHome }), pack);
    expect(state.exhausted).toContain('h1');
    expect(readyResources(state, pack)).toBe(1);
  });

  test('64.9: an exhausted planet cannot be spent', () => {
    const first = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const second = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [first, second], game: atHome });
    expect(codesOf(game, pack, second)).toContain('planetExhausted');
    expect(codesOf(game, pack, second)).toContain('shortResources');
  });

  test('64 note 1: Mecatol Rex and home planets have no traits', () => {
    expect(full.planets[MECATOL_PLANET]?.traits).toBeUndefined();
    expect(full.planets.jord?.traits).toBeUndefined();
  });

  test.todo('64 note 2: planets with traits can be explored — not modelled: exploration is not planned');

  test('64 note 3: one exhaustion pays resources or influence, not both: a planet spent on production cannot then pay influence', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const buy = secondary(CARD.leadership, { tokens: { tactic: 1 }, boughtTokens: 1, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    const codes = codesOf(rulesGame({ entries: [build, buy], game: atHome }), pack, buy);
    expect(codes).toContain('planetExhausted');
    expect(codes).toContain('shortInfluence');
  });

  test.todo('64 note 4: a planet exhausted for its specialty gives no resources or influence — not modelled: specialties are not spent');

  test('64 note 5: a player exhausts only their own planets: paying with a planet I do not control is warned about', () => {
    const buy = secondary(CARD.leadership, { tokens: { tactic: 1 }, boughtTokens: 1, payment: { planets: ['t2'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [buy] }), pack, buy)).toContain('planetNotControlled');
  });
});
