/** LRR 90 Technology. Source: tirules2 rules-reference/technology.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { CARD } from '../../strategy';
import { unitStats } from '../../unitStats';
import { before, codesOf, FACTION, forecast, HOME, NEAR, primary, rulesGame, rulesPack, secondary, tactical, TARGET } from '../kit';
import { holding } from './kit-83-101';

const pack = rulesPack();

describe('LRR 90 Technology', () => {
  test('90.1 / 90.2: a technology is owned from the entry that gains it on, and not before', () => {
    const research = primary(CARD.technology, {}, { upgrades: ['carrier'] });
    const game = holding(rulesGame({ entries: [research] }), CARD.technology);
    expect(before(game, pack, research).upgrades).not.toContain('carrier');
    expect(forecast(game, pack).state.upgrades).toContain('carrier');
  });

  test('90.3: research takes the technology from the player\'s deck into their play area', () => {
    const research = secondary(CARD.technology, { payment: { planets: ['h1', 'h2'], tradeGoods: 0 } }, { upgrades: ['cruiser'] });
    expect(forecast(rulesGame({ entries: [research] }), pack).state.upgrades).toEqual(['cruiser']);
  });

  test('90.3.1: both the primary and the secondary of Technology research', () => {
    const first = primary(CARD.technology, {}, { upgrades: ['carrier'] });
    const second = secondary(CARD.technology, { payment: { planets: ['h1', 'h2'], tradeGoods: 0 } }, { upgrades: ['cruiser'] });
    const game = holding(rulesGame({ rounds: [[first], [second]] }), CARD.technology);
    expect(forecast(game, pack).state.upgrades.sort()).toEqual(['carrier', 'cruiser']);
    expect(codesOf(game, pack, first)).toEqual([]);
    expect(codesOf(game, pack, second)).toEqual([]);
  });

  test.todo('90.4: a player may look through their deck at any time — not modelled: the deck is not shown');
  test.todo('90.5: a gained technology ignores prerequisites — not modelled: prerequisites are not tracked');

  test('90.6 / 90.6.1: a unit upgrade covers the unit of the same name: its numbers replace the printed ones', () => {
    expect(unitStats(FACTION, 'carrier', false, pack)?.capacity).toBe(4);
    expect(unitStats(FACTION, 'carrier', true, pack)?.capacity).toBe(6);
  });

  test.todo('90.7: a technology that is no unit upgrade has a colour — kept in the pack as its type, no effect to compute');
  test.todo('90.7.1: a colour satisfies prerequisites of that colour — not modelled: prerequisites are not tracked');

  test('90.7.2: unit upgrades have no colour: they are not among the coloured technologies of the pack', () => {
    const names = Object.values(pack.technologies).map(t => t.name);
    expect(names.some(name => / II$/.test(name))).toBe(false);
  });

  test('90.7.3: there are four colours of technology', () => {
    const colours = new Set(Object.values(loadPack(['pok', 'te']).technologies).map(t => t.type));
    expect([...colours].sort()).toEqual(['biotic', 'cybernetic', 'propulsion', 'warfare']);
  });

  test.todo('90.8: the prerequisites printed on a card — not modelled: prerequisites are not in the pack');
  test.todo('90.8.1: prerequisites give the number and colour needed — not modelled: prerequisites are not in the pack');
  test.todo('90.9: research comes from the Technology card or other effects — the card side is tested at 90.3.1; other effects are entered as upgrades on any card entry');

  test('90.10: research takes a card from the deck, so a technology already owned cannot be researched again', () => {
    const again = secondary(CARD.technology, { payment: { planets: ['h1', 'h2'], tradeGoods: 0 } }, { upgrades: ['carrier'] });
    const game = holding(rulesGame({ entries: [primary(CARD.technology, {}, { upgrades: ['carrier'] }), again] }), CARD.technology);
    expect(codesOf(game, pack, again)).not.toEqual([]);
  });

  test('90.10.1: a researched unit upgrade applies to the actions after it: a carrier II then moves two systems', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }] });
    const research = primary(CARD.technology, {}, { upgrades: ['carrier'] });
    const after = holding(rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [research, move] }), CARD.technology);
    expect(codesOf(after, pack, move)).not.toContain('speedShort');
  });

  test.todo('90.11: a faction technology of another faction cannot be researched — not modelled: faction technologies are not tracked');
  test.todo('90.12: research must satisfy every prerequisite — not modelled: prerequisites are not in the pack');
  test.todo('90.12.1: prerequisites are the symbols in the lower left — not modelled: prerequisites are not in the pack');
  test.todo('90.12.2: unit upgrades satisfy no prerequisite — not modelled: prerequisites are not in the pack');
  test.todo('90.12.3: abilities and specialties may ignore prerequisites — not modelled: prerequisites are not in the pack');
  test.todo('90.13: technology specialties on planets — kept in the pack, not used by research');
  test.todo('90.14: exhausting a planet with a specialty ignores one prerequisite — not modelled: prerequisites are not in the pack');
  test.todo('90.15: an exhausted planet\'s specialty cannot be used — not modelled: prerequisites are not in the pack');
  test.todo('90.16: Valefar Assimilator copies other players\' faction technologies — not modelled: faction technologies are not tracked');
  test.todo('90.17: printed units are no Valefar target — not modelled: faction technologies are not tracked');
  test.todo('90.18: an assimilated technology of an eliminated player stays — not modelled: faction technologies are not tracked');
  test.todo('90.19: losing assimilated Floating Factory moves the Nekro docks — not modelled: faction technologies are not tracked');
  test.todo('90.20: losing an assimilated war sun upgrade removes war suns — not modelled: faction technologies are not tracked');
  test.todo('90.21: Nekro upgrades units by type — not modelled: faction technologies are not tracked');
  test.todo('90.22: an assimilated technology counts for objectives — not modelled: objectives are not tracked');
  test.todo('90 note 1: research by any effect must meet prerequisites — not modelled: prerequisites are not in the pack');
  test.todo('90 note 2: gaining ignores prerequisites — not modelled: prerequisites are not in the pack');

  test('90 note 3: a faction with its own unit upgrade gets that one, never the generic upgrade', () => {
    const base = loadPack([]);
    expect(unitStats('sol', 'carrier', true, base)?.name).toBe('Advanced Carrier II');
    expect(unitStats('sol', 'carrier', true, base)?.capacity).toBe(8);
  });

  test.todo('90 notes 4-6: pointers to the notes pages of technologies, units and factions — nothing to model');
});
