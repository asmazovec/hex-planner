/** LRR 31 Destroyed. Source: tirules2 rules-reference/destroyed.md. */
import { describe, expect, test } from 'vitest';
import { forecast, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();

describe('LRR 31 Destroyed', () => {
  test('31 (intro): a destroyed unit leaves the board', () => {
    const fight = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 2 } }], losses: { cruiser: 1 } });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { cruiser: 2 } }, entries: [fight] }), pack);
    expect(state.systems[TARGET]).toEqual({ cruiser: 1 });
    expect(state.systems[NEAR] ?? {}).toEqual({});
  });

  test('31 (intro): a ground force destroyed on a planet leaves the board too', () => {
    const fight = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
      landings: [{ planetId: 't1', units: { infantry: 2 } }],
      groundLosses: { t1: { infantry: 1 } },
    });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [fight] }), pack);
    expect(state.ground.t1).toEqual({ infantry: 1 });
  });

  test.todo('31.1: the owner chooses which units the hits destroy, one per hit — not modelled: no dice are rolled, the losses are chosen by hand');
  test.todo('31.2: a unit removed by an effect is not destroyed and triggers nothing — not modelled: removals and destructions are not told apart');
});
