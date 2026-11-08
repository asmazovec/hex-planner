/** LRR 97 Unit Upgrades. Source: tirules2 rules-reference/unit-upgrades.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { CARD } from '../../strategy';
import { hasLevelTwo, SHIP_KINDS, unitStats } from '../../unitStats';
import { codesOf, FACTION, HOME, NEAR, primary, rulesGame, rulesPack, tactical, TARGET } from '../kit';
import { holding } from './kit-83-101';

const pack = rulesPack();

describe('LRR 97 Unit Upgrades', () => {
  test('97.1: an upgrade shares the unit\'s name with a higher numeral: Carrier I becomes Carrier II', () => {
    for (const kind of ['carrier', 'cruiser', 'destroyer', 'dreadnought', 'fighter'] as const) {
      const one = unitStats(FACTION, kind, false, pack)?.name ?? '';
      expect(unitStats(FACTION, kind, true, pack)?.name).toBe(one.replace(/ I$/, ' II'));
    }
  });

  test('97.1: infantry has a unit upgrade too (Infantry II), which the player can gain', () => {
    expect(hasLevelTwo(FACTION, 'infantry', pack)).toBe(true);
  });

  test.todo('97.1.1: the Nekro Virus upgrade units of the same type whatever the name — not modelled: faction technologies are not tracked');
  test.todo('97.2: the upgrade card covers the unit on the faction sheet — display only; the effect is tested at 97.4');
  test.todo('97.3: white arrows mark what improves — display only, nothing to compute');

  test('97.4: after the upgrade the unit has the upgrade\'s numbers: a carrier then moves two and carries six', () => {
    const research = primary(CARD.technology, {}, { upgrades: ['carrier'] });
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1, infantry: 6 }, via: [NEAR] }] });
    const game = holding(rulesGame({ units: { [HOME]: { carrier: 1, infantry: 6 } }, entries: [research, move] }), CARD.technology);
    expect(codesOf(game, pack, move)).toEqual([]);
  });

  test('97.4: before the upgrade the printed numbers still hold', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1, infantry: 6 }, via: [NEAR] }] });
    const research = primary(CARD.technology, {}, { upgrades: ['carrier'] });
    const game = holding(rulesGame({ units: { [HOME]: { carrier: 1, infantry: 6 } }, entries: [move, research] }), CARD.technology);
    expect(codesOf(game, pack, move)).toEqual(expect.arrayContaining(['speedShort', 'capacityGroup']));
  });

  test('97.5: a mech card is no technology: it has no upgrade to research', () => {
    const pok = loadPack(['pok']);
    expect(hasLevelTwo('sol', 'mech', pok)).toBe(false);
    expect(SHIP_KINDS).not.toContain('mech');
  });

  test('97 note 1: a faction with its own carrier upgrade gets Advanced Carrier II, not the generic Carrier II', () => {
    const base = loadPack([]);
    const upgraded = unitStats('sol', 'carrier', true, base);
    expect(upgraded?.name).toBe('Advanced Carrier II');
    expect(upgraded?.capacity).toBe(8);
  });

  test.todo('97 notes 2-3: pointers to the unit and faction notes pages — nothing to model');
});
