import { describe, expect, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, HOME, quote, warningsOf } from '../kit';
import { id } from './arborecagent';

/** The check pass 2 adds for the agent's choice: a replacement that costs more than 2 above the replaced ship. */
const REPLACEMENT_COST = 'replacementCost' as AnyWarningCode;

/** The agent's action on my ship in the home system: `ship` (a destroyer, cost 1) gives way to `replacement`. */
const agent = (replacement: string, leaders: Record<string, 'unlocked' | 'exhausted'> = { [id]: 'unlocked' }) => {
  const play = componentAction(id, { choices: { systemId: HOME, ship: 'destroyer', replacement } });
  return { play, ...bench({ faction: 'arborec', expansions: ['pok'], units: { [HOME]: { destroyer: 1 } }, start: { leaders }, entries: [play] }) };
};

describe('leader:arborecagent Letani Ospha', () => {
  // "ACTION: Exhaust this card and choose a player's non-fighter ship: that player may replace that ship with one from
  //  their reinforcements that costs up to 2 more than the replaced ship."
  // Checks: my destroyer (cost 1) is replaced by a cruiser (cost 2): the board holds the cruiser and not the destroyer.
  // Why the default does not apply: ships enter the board by production only (67), paid for; the agent places one
  // without producing it (Arborec, Letani Ospha note 1), so no production or payment is checked.
  test.fails('leader:arborecagent replaces a destroyer with a cruiser', () => {
    const table = agent('cruiser');
    quote(table.pack, id, 'replace that ship with one from their reinforcements that costs up to 2 more than the replaced ship');
    expect(endOf(table).systems[HOME]).toEqual({ cruiser: 1 });
    expectNone(warningsOf(table, table.play), 'shortResources');
    expectNone(warningsOf(table, table.play), 'noProduction');
  });

  // Checks: a carrier (cost 3) is 2 more than the destroyer: still within the card.
  test.fails('leader:arborecagent a replacement exactly 2 dearer is within the card', () => {
    const table = agent('carrier');
    expect(endOf(table).systems[HOME]).toEqual({ carrier: 1 });
    expectNone(warningsOf(table, table.play), REPLACEMENT_COST);
  });

  // "... that costs up to 2 more than the replaced ship."
  // Checks: a dreadnought (cost 4) is 3 more than the destroyer: the replacement is warned of, and made all the same.
  // Why the check is NOT redundant here: the card's own limit is 2 more.
  test.fails('leader:arborecagent a replacement 3 dearer is warned of', () => {
    const table = agent('dreadnought');
    expectStanding(warningsOf(table, table.play), REPLACEMENT_COST);
    expect(endOf(table).systems[HOME]).toEqual({ dreadnought: 1 });
  });

  // LRR 51.4 with the card's "Exhaust this card": an exhausted agent is not used again before it is readied.
  // Checks: the agent already exhausted is warned of when played.
  test('leader:arborecagent exhausted is warned of when played again', () => {
    const table = agent('cruiser', { [id]: 'exhausted' });
    expectStanding(warningsOf(table, table.play), 'componentExhausted');
  });

  test.fails('leader:arborecagent is a play effect', () => {
    expect(effect(agent('cruiser').pack, id).tier).toBe('play');
  });

  test.todo('leader:arborecagent replaces another player\'s ship: the play changes the board of its owner only, and the rival\'s state is not reached from my entry');
});
