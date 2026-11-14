import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, NEAR, quote, TARGET, tactical, type Bench } from '../kit';
import { id } from './aw1';

/** Round 1: a carrier from the next system lands one infantry on Target One; round 2: the other one on Target Two. */
const first = (gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, gains.length > 0 ? { gains } : {});
const second = (gains: string[] = []) => tactical(TARGET, { landings: [{ planetId: 't2', units: { infantry: 1 } }] }, gains.length > 0 ? { gains } : {});
/** The wanted shape (pass 2): what the player chose for the card, in the entry's `choices` under the card's id. */
const choosing = (entry: Entry, choice: 'gain' | 'convert'): Entry => ({ ...entry, choices: { [id]: choice } } as Entry);
/** The Barony of Letnev: a commodity value of 2. */
const table = (rounds: Entry[][]): Bench => bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 2 } }, rounds });

describe('exploration:aw1 Abandoned Warehouses', () => {
  // "You may gain 2 commodities"
  // Checks: the card explored with Target One gives the Letnev two commodities.
  // Why the check is redundant here: nothing is lifted; the plan counts the commodities, so the two gained must be counted.
  test('exploration:aw1 gains two commodities', () => {
    const warehouses = table([[choosing(first([id]), 'gain')]]);
    quote(warehouses.pack, id, 'You may gain 2 commodities');
    expect(endOf(warehouses).commodities).toBe(2);
  });

  // LRR 21.2: "The commodity value on a player’s faction sheet indicates the maximum number of commodities that player
  //  can have."
  // Checks: with two commodities already, a second card gains none beyond the Letnev value of 2.
  // Why the check is NOT redundant here: the card gains commodities, it does not raise the faction's maximum.
  test('exploration:aw1 gains no commodities beyond the commodity value', () => {
    const warehouses = table([[choosing(first([id]), 'gain')], [choosing(second([id]), 'gain')]]);
    expect(endOf(warehouses).commodities).toBe(2);
  });

  // "... or you may convert up to 2 of your commodities to trade goods."
  // Checks: the commodities gained in round 1 become two trade goods in round 2.
  // Why the check is redundant here: commodities are not spent (21.7); the card is what converts them.
  test('exploration:aw1 converts two commodities to trade goods', () => {
    const warehouses = table([[choosing(first([id]), 'gain')], [choosing(second([id]), 'convert')]]);
    const plain = table([[choosing(first([id]), 'gain')], [second()]]);
    expect(endOf(warehouses).commodities).toBe(0);
    expect(endOf(warehouses).tradeGoods).toBe(endOf(plain).tradeGoods + 2);
  });

  // "... convert up to 2 of your commodities"
  // Checks: with no commodities nothing is converted and no trade good appears.
  // Why the check is NOT redundant here: the card converts the player's own commodities, up to what they have.
  test('exploration:aw1 converts nothing when the player has no commodities', () => {
    const warehouses = table([[choosing(first([id]), 'convert')]]);
    expect(endOf(warehouses).tradeGoods).toBe(endOf(table([[first()]])).tradeGoods);
  });

  test('exploration:aw1 is a played effect', () => {
    expect(effect(table([[]]).pack, id).tier).toBe('play');
  });
});
