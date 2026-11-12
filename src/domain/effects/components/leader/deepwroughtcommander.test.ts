import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './deepwroughtcommander';

describe('leader:deepwroughtcommander Aello', () => {
  // "When another player spends resources to research a technology: That player may reduce the cost by 1; if they
  //  do, gain 1 commodity or convert 1 of your commodities to a trade good."
  // Checks: the commander is a reminder of the strategy card's block, where research is paid.
  // Why the check is NOT redundant here: it acts only in another player's research. A waiver or a change of a number
  // is asked of the owner of the entry alone (known limit of the foundation), so the Deepwrought commander is not
  // asked in a rival's entry, and what the Deepwrought player gains in return depends on that player's choice.
  test('leader:deepwroughtcommander is a hint at the card: it acts in another player\'s research', () => {
    const { pack } = bench({ faction: 'deepwrought', expansions: ['pok', 'te'] });
    quote(pack, id, 'That player may reduce the cost by 1');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['card']);
  });
});
