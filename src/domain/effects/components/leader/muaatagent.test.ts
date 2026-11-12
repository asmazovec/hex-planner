import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, HOME, quote, warningsOf } from '../kit';
import { id } from './muaatagent';

const table = (entries: Entry[]) =>
  bench({ faction: 'muaat', expansions: ['pok'], units: { [HOME]: { warsun: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:muaatagent Umbat', () => {
  // "ACTION: Exhaust this card to choose a player ..."
  // Checks: the component action exhausts the agent, so a second play in the round is warned of.
  // Why the check is NOT redundant here: an exhausted agent cannot be played again until it is readied (34.2).
  test('leader:muaatagent is exhausted by its play: a second play in the round is warned of', () => {
    const first = componentAction(id);
    const again = componentAction(id);
    const muaat = table([first, again]);
    quote(muaat.pack, id, 'ACTION: Exhaust this card to choose a player');
    expect(endOf(muaat).holdings.leaders[id]).toBe('exhausted');
    expectStanding(warningsOf(muaat, again), 'componentExhausted');
  });

  test.todo('leader:muaatagent the chosen player produces up to 2 units of cost 4 or less in a system with their war sun or flagship, with no space dock: a component action has no production of its own yet');
  test.todo('leader:muaatagent a third unit, or a unit costing more than 4, is warned of: needs the production of a component action first');
  test.todo('leader:muaatagent the units are paid for (Umbat note 1): needs the production of a component action first');

  test('leader:muaatagent is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
