import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './probe';

const table = () => bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] } });

describe('actionCard:probe Exploration Probe', () => {
  // "Explore a frontier token that is in or adjacent to a system that contains 1 or more of your ships."
  // Checks: the card is a hint, shown at the step component; it waives nothing and changes no number.
  // Why nothing is validated here: The plan does not replay exploration: frontier tokens are not on its board and the
  // exploration card drawn is no holding of a player (LRR 35, 38; a relic fragment is an exploration card). What the
  // exploration gives (a relic, trade goods) is entered in «Gained and discarded» by hand.
  test('actionCard:probe is a hint at component, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'Explore a frontier token');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['component']);
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
  });

  test.todo('actionCard:probe exploring a frontier token: frontier tokens and exploration decks are not modelled');
});
