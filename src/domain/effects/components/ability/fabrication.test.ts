import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, quote, warningsOf } from '../kit';
import { id } from './fabrication';

const naaz = (entries: Entry[]) => bench({ faction: 'naaz', expansions: ['pok'], entries });
const tokens = (entries: Entry[]) => {
  const { tactic, fleet, strategy } = endOf(naaz(entries));
  return { tactic, fleet, strategy };
};

describe('ability:fabrication Fabrication', () => {
  // "... or purge 1 of your relic fragments to gain 1 command token."
  // Checks: the ability played by a component action with the choice of a token in the tactic pool gives one more
  // tactic token than the plan without it.
  // Why the check is redundant here: command tokens are gained in the status phase and by Leadership (LRR 20); the
  // ability is one more source, and the count of tokens must hold it, or every later entry is warned of a pool short
  // by one.
  test('ability:fabrication gains 1 command token in the chosen pool', () => {
    const play = componentAction(id, { choices: { gain: 'token', pool: 'tactic' } } as Partial<Entry>);
    quote(naaz([]).pack, id, 'purge 1 of your relic fragments to gain 1 command token');
    const without = tokens([]);
    expect(tokens([play])).toEqual({ ...without, tactic: without.tactic + 1 });
  });

  // Checks: the token goes where the player puts it: the fleet pool.
  test('ability:fabrication the token may go to the fleet pool', () => {
    const play = componentAction(id, { choices: { gain: 'token', pool: 'fleet' } } as Partial<Entry>);
    const without = tokens([]);
    expect(tokens([play])).toEqual({ ...without, fleet: without.fleet + 1 });
  });

  // "Either purge 2 of your relic fragments of the same type to gain 1 relic; ..."
  // Checks: the relic choice gains no token; the relic is entered with the action and is held after it.
  // Why nothing more is counted here: the relic fragments are exploration cards the plan does not hold.
  test('ability:fabrication the relic choice gains the relic entered and no token', () => {
    const play = componentAction(id, { choices: { gain: 'relic' }, gains: ['relic:obsidian'] } as Partial<Entry>);
    const without = tokens([]);
    expect(tokens([play])).toEqual(without);
    expect(endOf(naaz([play])).holdings.relics).toContain('relic:obsidian');
  });

  // Checks: the ability played with no choice made gives nothing.
  // Why nothing is counted here: the player has not said what the fragments buy.
  test('ability:fabrication with no choice gives nothing', () => {
    expect(tokens([componentAction(id)])).toEqual(tokens([]));
  });

  // "Either purge 2 of your relic fragments of the same type to gain 1 relic; or purge 1 of your relic fragments to gain 1 command token."
  // Checks: one fragment held and purged for a token, then two for a relic: no "not enough fragments" warning.
  // Why the check is NOT the fragment's own: the three-fragment rule (LRR 73.1) belongs to the fragment's action, not to its purge by another card.
  test('ability:fabrication a fragment purged by it is no action of the fragment: no relicFragmentsShort', () => {
    const token = componentAction(id, { choices: { gain: 'token', pool: 'tactic' }, spends: ['exploration:crf1'] } as Partial<Entry>);
    const relic = componentAction(id, { choices: { gain: 'relic' }, spends: ['exploration:crf1', 'exploration:crf1'] } as Partial<Entry>);
    const table = bench({ faction: 'naaz', expansions: ['pok'], start: { found: ['exploration:crf1', 'exploration:crf1', 'exploration:crf1'] }, entries: [token, relic] });
    for (const entry of [token, relic]) expect(warningsOf(table, entry).map(w => w.code)).not.toContain('relicFragmentsShort');
  });

  test.todo('ability:fabrication the relic fragments purged: exploration cards are not held by the plan');

  test('ability:fabrication is a play effect', () => {
    const { pack } = naaz([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).nativePlay).toBeTypeOf('function');
  });
});
