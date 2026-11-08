/** LRR 14 Blockaded. Source: tirules2 rules-reference/blockaded.md. My space dock stands on h1 in the home system. */
import { describe, expect, test } from 'vitest';
import { codesOf, HOME, NEAR, rulesGame, rulesPack, tactical } from '../kit';

const pack = rulesPack();
const enemyAtHome = { [HOME]: { o1: { destroyer: 1 } } };

describe('LRR 14 Blockaded', () => {
  test('14.1: a blockaded unit cannot produce ships: other players\' ships and none of mine in the system is warned about', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [build], game: { docks: ['h1'], enemyUnits: enemyAtHome } });
    expect(codesOf(game, pack, build)).toContain('blockaded');
  });

  test('14.1: a blockaded unit still produces ground forces', () => {
    const build = tactical(HOME, { production: { infantry: 2 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [build], game: { docks: ['h1'], enemyUnits: enemyAtHome } });
    expect(codesOf(game, pack, build)).not.toContain('blockaded');
  });

  test.todo('14.2: blockading a dock returns the blockader\'s units the blockaded player captured — not modelled: capture is not');
  test.todo('14.2.1: a blockaded player cannot capture the blockader\'s units — not modelled: capture is not');

  test('14 note 1: a player whose ships are in the system is not blockaded: ships that arrive for a battle may produce', () => {
    const build = tactical(HOME, { moves: [{ from: NEAR, units: { cruiser: 1 } }], production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 } }, entries: [build], game: { docks: ['h1'], enemyUnits: enemyAtHome } });
    expect(codesOf(game, pack, build)).not.toContain('blockaded');
  });

  test.todo('14 note 1.1: a unit blockaded elsewhere still stops capturing — not modelled: capture is not');
  test.todo('14 note 2: a dock left with only enemy fighters is blockaded before the fighters are removed — not modelled: capture is not, the only thing it matters for');
  test.todo('14 note 3: a ship moving through a system blockades nothing there — not modelled: blockades of passing ships are not tracked');
});
