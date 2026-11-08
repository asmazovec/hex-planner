/** LRR 13 Attacker. Source: tirules2 rules-reference/attacker.md (no numbered sub-rules). */
import { describe, expect, test } from 'vitest';
import { forecast, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();
const rival = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };

describe('LRR 13 Attacker', () => {
  test('13: the active player is the attacker: a battle belongs to the active player\'s action, and its losses are theirs alone', () => {
    const attack = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 2 } }], losses: { cruiser: 1 } }, { owner: rival.id });
    const game = rulesGame({
      units: { [TARGET]: { cruiser: 1 } }, entries: [attack],
      game: { opponents: [rival], enemyUnits: { [NEAR]: { [rival.id]: { cruiser: 2 } } } },
    });
    const { state } = forecast(game, pack);
    expect(state.systems[TARGET]).toEqual({ cruiser: 1 });
    expect(state.rivals?.[rival.id].systems[TARGET]).toEqual({ cruiser: 1 });
  });

  test.todo('13 note 1: the attacker\'s opponent is the defender — not modelled: combat roles are not');
  test.todo('13 note 2: the attacker resolves abilities first in each window — not modelled: timing windows are not');
  test.todo('13 note 3: after Mahact\'s Benediction the player whose ships moved attacks, abilities going in initiative order from Mahact — not modelled: heroes are not resolved');
});
