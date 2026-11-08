/** LRR 10 Anti-Fighter Barrage. Source: tirules2 rules-reference/anti-fighter-barrage.md. Dice are not rolled: losses are entered by hand. */
import { describe, expect, test } from 'vitest';
import { unitStats } from '../../unitStats';
import { FACTION, forecast, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();

describe('LRR 10 Anti-Fighter Barrage', () => {
  test.todo('10.1: each anti-fighter barrage unit rolls, hitting on its value or more — not modelled: dice are not rolled');

  test('10.1.1: anti-fighter barrage is given with the unit\'s attributes, at each level', () => {
    expect(unitStats(FACTION, 'destroyer', false, pack)?.barrage).toBeDefined();
    expect(unitStats(FACTION, 'destroyer', true, pack)?.barrage).toBeDefined();
    expect(unitStats(FACTION, 'cruiser', false, pack)?.barrage).toBeUndefined();
  });

  test('10.1.2: barrage X (xY) hits on X or more with Y dice: a destroyer I has 9 (x2), a destroyer II 6 (x3)', () => {
    expect(unitStats(FACTION, 'destroyer', false, pack)?.barrage).toEqual({ hit: 9, dice: 2 });
    expect(unitStats(FACTION, 'destroyer', true, pack)?.barrage).toEqual({ hit: 6, dice: 3 });
  });

  test.todo('10.1.3: effects on combat rolls do not touch barrage rolls — not modelled: dice are not rolled');
  test.todo('10.1.4: barrage may be rolled with no fighters present, for abilities — not modelled: dice are not rolled');

  test('10.2: fighters destroyed by the barrage leave the active system: they are entered as the action\'s losses', () => {
    const battle = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, fighter: 3 } }], losses: { fighter: 2 } });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, fighter: 3 } }, entries: [battle] }), pack);
    expect(state.systems[TARGET]).toEqual({ carrier: 1, fighter: 1 });
  });

  test.todo('10.2.1: hits beyond the fighters present have no effect — not modelled: hits are not counted, only the losses entered');
  test.todo('10 note 1: sustain damage cannot cancel a barrage hit — not modelled: hits are not counted');
  test.todo('10 note 2: Shields Holding and the like may cancel barrage hits — not modelled: action cards are not');
  test.todo('10 note 3: the 0 of a d10 is a 10 — not modelled: dice are not rolled');
});
