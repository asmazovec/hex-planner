import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, endOf, quote } from '../kit';
import { id } from './quantumcore';

const gaining = (): Entry => ({ ...adjust({}), gains: [id] });

describe('relic:quantumcore The Quantumcore', () => {
  // "When you gain this card, gain your breakthrough."
  // Checks: an entry that gains the relic gives the player their faction's breakthrough as well.
  // Why the check is redundant here: a breakthrough is otherwise gained by its own condition (TE, Breakthroughs);
  // the relic gives it on being gained, so the holdings must show it held without a gain of its own.
  test('relic:quantumcore gained brings the faction\'s breakthrough', () => {
    const table = bench({ faction: 'sol', expansions: ['te'], entries: [gaining()] });
    quote(table.pack, id, 'When you gain this card, gain your breakthrough.');
    expect(table.pack.factions.sol.sheet?.breakthrough).toBeDefined();
    const end = endOf(table);
    expect(end.holdings.relics).toContain(id);
    expect(end.holdings.breakthrough).toBe('held');
  });

  // "When you gain this card, ..."
  // Checks: a player who holds the relic from the start of the plan is not given the breakthrough by the plan.
  // Why the check is NOT redundant here: the relic was gained before the plan begins, and what was gained then is set
  // in the holdings at the start, breakthrough included.
  test('relic:quantumcore held from the start gives nothing by itself', () => {
    const table = bench({ faction: 'sol', expansions: ['te'], start: { relics: [id] } });
    expect(endOf(table).holdings.breakthrough).toBeUndefined();
  });

  // Checks: gaining another relic gives no breakthrough, so the test above is not empty.
  // Why the check is NOT redundant here: only this relic speaks of the breakthrough.
  test('relic:quantumcore another relic gained brings no breakthrough', () => {
    const table = bench({ faction: 'sol', expansions: ['te'], entries: [{ ...adjust({}), gains: ['relic:heartofixth'] }] });
    expect(endOf(table).holdings.breakthrough).toBeUndefined();
  });

  test.todo('relic:quantumcore SYNERGY for all technology types lets any technology stand for any colour of prerequisite: the replay checks no prerequisites yet');
});
