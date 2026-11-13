/** LRR 90 Technology. Source: tirules2 rules-reference/technology.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { CARD } from '../../strategy';
import { unitStats } from '../../unitStats';
import { before, codesOf, FACTION, forecast, HOME, NEAR, primary, rulesGame, rulesPack, secondary, tactical, TARGET, tech } from '../kit';
import { holding } from './kit-83-101';

const pack = rulesPack();

describe('LRR 90 Technology', () => {
  test('90.1 / 90.2: a technology is owned from the entry that gains it on, and not before', () => {
    const research = primary(CARD.technology, { researched: [tech('carrier')] });
    const game = holding(rulesGame({ entries: [research] }), CARD.technology);
    expect(before(game, pack, research).holdings.technologies).not.toContain(tech('carrier'));
    expect(forecast(game, pack).state.holdings.technologies).toContain(tech('carrier'));
  });

  test('90.3: research takes the technology from the player\'s deck into their play area', () => {
    const research = secondary(CARD.technology, { researched: [tech('cruiser')], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    expect(forecast(rulesGame({ entries: [research] }), pack).state.holdings.technologies).toEqual([tech('cruiser')]);
  });

  test('90.3.1: both the primary and the secondary of Technology research', () => {
    const first = primary(CARD.technology, { researched: ['technology:st'] });
    const second = secondary(CARD.technology, { researched: ['technology:nm'], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    const game = holding(rulesGame({ rounds: [[first], [second]] }), CARD.technology);
    expect(forecast(game, pack).state.holdings.technologies).toEqual(['technology:st', 'technology:nm']);
    expect(codesOf(game, pack, first)).toEqual([]);
    expect(codesOf(game, pack, second)).toEqual([]);
  });

  test.todo('90.4: a player may look through their deck at any time — not modelled: the deck is not shown');

  test('90.6 / 90.6.1: a unit upgrade covers the unit of the same name: its numbers replace the printed ones', () => {
    expect(unitStats(FACTION, 'carrier', false, pack)?.capacity).toBe(4);
    expect(unitStats(FACTION, 'carrier', true, pack)?.capacity).toBe(6);
  });

  test.todo('90.7: a technology that is no unit upgrade has a colour — kept in the pack as its type, no effect to compute');

  test('90.7.2: unit upgrades have no colour: the faction unit upgrades of the pack have no type', () => {
    const upgrades = Object.values(loadPack(['pok', 'te']).technologies).filter(t => t.upgrade);
    expect(upgrades.length).toBeGreaterThan(0);
    for (const tech of upgrades) expect(tech.type, tech.id).toBeNull();
  });

  test('90.7.3: there are four colours of technology', () => {
    const colours = new Set(Object.values(loadPack(['pok', 'te']).technologies).flatMap(t => t.type ?? []));
    expect([...colours].sort()).toEqual(['biotic', 'cybernetic', 'propulsion', 'warfare']);
  });


  test('90.8.1: prerequisites give the number and colour needed: Prototype War Sun II needs three warfare and one cybernetic', () => {
    expect(loadPack([]).technologies.pws2.requires).toEqual({ warfare: 3, cybernetic: 1 });
  });
  test.todo('90.9: research comes from the Technology card or other effects — the card side is tested at 90.3.1; other effects are entered as the `gains` of any entry (src/domain/holdings.test.ts)');

  const ONE_BIOTIC = 'technology:it';
  const TWO_BIOTIC = 'technology:hm';
  const research = (...ids: string[]) => secondary(CARD.technology, { researched: ids, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
  const owning = (technologies: string[], entry: ReturnType<typeof research>) =>
    ({ game: rulesGame({ entries: [entry], game: { start: { me: { technologies }, opponents: {} } } }), pack });

  test('90.12 / 90.8.1: a technology researched without one technology of the colour per prerequisite symbol is a prerequisitesMissing', () => {
    const entry = research(TWO_BIOTIC);
    const lacking = owning(['technology:nm'], entry);
    expect(codesOf(lacking.game, lacking.pack, entry)).toContain('prerequisitesMissing');
    const enough = owning(['technology:nm', 'technology:pa'], entry);
    expect(codesOf(enough.game, enough.pack, entry)).not.toContain('prerequisitesMissing');
  });

  test('90.12.2 / 90.7.2: a unit upgrade has no colour and covers no prerequisite', () => {
    const entry = research(ONE_BIOTIC);
    const upgrades = owning([tech('carrier'), tech('cruiser')], entry);
    expect(codesOf(upgrades.game, upgrades.pack, entry)).toContain('prerequisitesMissing');
  });

  test('90.7.1: a technology of a colour satisfies a prerequisite of that colour', () => {
    const entry = research(ONE_BIOTIC);
    const owned = owning(['technology:nm'], entry);
    expect(codesOf(owned.game, owned.pack, entry)).not.toContain('prerequisitesMissing');
  });

  test('90 note 1 / 90.9: research by the card meets the prerequisites, the first technology of an entry serving the second', () => {
    const entry = primary(CARD.technology, { researched: ['technology:nm', ONE_BIOTIC] });
    expect(codesOf(holding(rulesGame({ entries: [entry] }), CARD.technology), pack, entry)).not.toContain('prerequisitesMissing');
  });

  test('90.5 / 90 note 2: a technology gained is not researched: it ignores prerequisites', () => {
    const gain = tactical(TARGET, { gains: [TWO_BIOTIC] });
    expect(codesOf(rulesGame({ entries: [gain] }), pack, gain)).not.toContain('prerequisitesMissing');
  });

  test('90.14 / 90.12.3: exhausting a planet with a technology specialty ignores one prerequisite of its colour', () => {
    const entry = secondary(CARD.technology, { researched: [ONE_BIOTIC], payment: { planets: [], tradeGoods: 0 }, specialties: ['h2'] });
    const specialty = rulesPack(data => { data.planets.h2 = { ...data.planets.h2, tech: ['biotic'] }; });
    const game = rulesGame({ entries: [entry] });
    expect(codesOf(game, specialty, entry)).not.toContain('prerequisitesMissing');
    expect(forecast(game, specialty).state.exhausted).toContain('h2');
    // Of another colour it ignores nothing.
    const wrong = rulesPack(data => { data.planets.h2 = { ...data.planets.h2, tech: ['warfare'] }; });
    expect(codesOf(game, wrong, entry)).toContain('prerequisitesMissing');
  });

  test('90.15: a planet already exhausted cannot be used for its specialty', () => {
    const entry = secondary(CARD.technology, { researched: [ONE_BIOTIC], payment: { planets: ['h2'], tradeGoods: 0 }, specialties: ['h2'] });
    const specialty = rulesPack(data => { data.planets.h2 = { ...data.planets.h2, tech: ['biotic'] }; });
    const codes = codesOf(rulesGame({ entries: [entry] }), specialty, entry);
    expect(codes).toContain('planetExhausted');
    expect(codes).toContain('prerequisitesMissing');
  });

  test('90.9 / 90.5: a technology that cannot be researched is a researchUnavailable when researched, none when gained', () => {
    const full = rulesPack(undefined, ['pok', 'te']);
    const entry = research('technology:planesplitter-obs');
    expect(codesOf(rulesGame({ entries: [entry], expansions: ['pok', 'te'] }), full, entry)).toContain('researchUnavailable');
    const gain = tactical(TARGET, { gains: ['technology:planesplitter-obs'] });
    expect(codesOf(rulesGame({ entries: [gain], expansions: ['pok', 'te'] }), full, gain)).not.toContain('researchUnavailable');
  });

  test('90.10: research takes a card from the deck, so a technology already owned cannot be researched again', () => {
    const again = secondary(CARD.technology, { researched: [tech('carrier')], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    const game = holding(rulesGame({ entries: [primary(CARD.technology, { researched: [tech('carrier')] }), again] }), CARD.technology);
    expect(codesOf(game, pack, again)).not.toEqual([]);
  });

  test('90.10: an upgrade researched again is a researchOwned and costs nothing more', () => {
    const again = primary(CARD.technology, { researched: [tech('carrier'), 'technology:st'] });
    const game = holding(rulesGame({ rounds: [[primary(CARD.technology, { researched: [tech('carrier')] })], [again]] }), CARD.technology);
    expect(codesOf(game, pack, again)).toEqual(['researchOwned']);
  });

  test('90.10.1: a researched unit upgrade applies to the actions after it: a carrier II then moves two systems', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }] });
    const research = primary(CARD.technology, { researched: [tech('carrier')] });
    const after = holding(rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [research, move] }), CARD.technology);
    expect(codesOf(after, pack, move)).not.toContain('speedShort');
  });

  test.todo('90.11: a faction technology of another faction cannot be researched — not modelled: faction technologies are not tracked');
  test.todo('90.13: technology specialties on planets — kept in the pack, not used by research');
  test.todo('90.16: Valefar Assimilator copies other players\' faction technologies — not modelled: faction technologies are not tracked');
  test.todo('90.17: printed units are no Valefar target — not modelled: faction technologies are not tracked');
  test.todo('90.18: an assimilated technology of an eliminated player stays — not modelled: faction technologies are not tracked');
  test.todo('90.19: losing assimilated Floating Factory moves the Nekro docks — not modelled: faction technologies are not tracked');
  test.todo('90.20: losing an assimilated war sun upgrade removes war suns — not modelled: faction technologies are not tracked');
  test.todo('90.21: Nekro upgrades units by type — not modelled: faction technologies are not tracked');
  test.todo('90.22: an assimilated technology counts for objectives — not modelled: objectives are not tracked');

  test('90.10: a technology of another faction is warned of when researched, the own one is not', () => {
    const real = loadPack(['pok', 'te']);
    const foreign = secondary(CARD.technology, { researched: ['technology:l4'], payment: { planets: [], tradeGoods: 0 } });
    const own = secondary(CARD.technology, { researched: ['technology:qdn'], payment: { planets: [], tradeGoods: 0 } });
    const game = rulesGame({ entries: [foreign, own], game: { faction: 'hacan' } });
    expect(codesOf(game, real, foreign)).toContain('researchForeign');
    expect(codesOf(game, real, own)).not.toContain('researchForeign');
  });

  test('90 note 3: a faction with its own unit upgrade gets that one, never the generic upgrade', () => {
    const base = loadPack([]);
    expect(unitStats('sol', 'carrier', true, base)?.name).toBe('Advanced Carrier II');
    expect(unitStats('sol', 'carrier', true, base)?.capacity).toBe(8);
  });

  test.todo('90 notes 4-6: pointers to the notes pages of technologies, units and factions — nothing to model');
});
