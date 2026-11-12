import { describe, expect, test } from 'vitest';
import type { Entry, ExtensionCode } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './mrte';

/**
 * The warning that a component's own condition is not met, as pass 2 is to declare it in
 * src/domain/rules/codes/componentCondition.ts (rules 53.3, step 'component').
 */
const CONDITION = 'componentCondition' as ExtensionCode;
const KEPT = 'secretObjective:ans';
const DRAWN = 'secretObjective:btgk';

/** A turn that ends with the Galactic Council: it names the card, discards `spends` and draws `gains`. */
const council = (swap: { spends?: string[]; gains?: string[] } = { spends: [KEPT], gains: [DRAWN] }) =>
  ({ ...using(tactical(NEAR), id), ...swap }) as Entry;
const table = (entries: Entry[], { secrets = [KEPT], control = true } = {}) =>
  bench({ faction: 'letnev', expansions: ['te'], start: { secrets }, entries, game: { planetControl: control ? { mrte: 'me' } : {} } });

describe('legendary:mrte The Galactic Council', () => {
  // "You may exhaust this card at the end of your turn and discard 1 secret objective to draw 1 secret objective."
  // Checks: the swap is entered as the entry's discard and draw; the hand holds the drawn secret and the card is exhausted.
  // Why nothing is waived: drawing a secret objective outside the status phase is no check of the plan; the gains and
  // discards of an entry record any card drawn or discarded, and the plan holds no other limit to lift.
  test('legendary:mrte swaps a secret objective in hand and is exhausted', () => {
    const entry = council();
    const game = table([entry]);
    quote(game.pack, id, 'discard 1 secret objective to draw 1 secret objective');
    const end = endOf(game);
    expect(end.holdings.secrets).toEqual([DRAWN]);
    expect(end.holdings.exhausted).toContain(id);
    expectNone(warningsOf(game, entry), CONDITION);
  });

  // Galactic Council note 1: "The Galactic Council cannot be exhausted by a player that has no unscored secret
  //  objective cards in their hand."
  // Checks: a player with no secret objective in hand names the card; the condition is warned of.
  // Why the check is NOT redundant here: the card asks for a secret to discard, and there is none.
  test.fails('legendary:mrte with no secret objective in hand is warned of', () => {
    const entry = council({ gains: [DRAWN] });
    expectStanding(warningsOf(table([entry], { secrets: [] }), entry), CONDITION);
  });

  // LRR 34.4: an exhausted card cannot be exhausted again until readied.
  // Checks: a second use in the round is warned of as exhausted.
  test('legendary:mrte used twice in a round is warned of as exhausted', () => {
    const second = { ...using(tactical(TARGET), id), spends: [DRAWN], gains: [KEPT] } as Entry;
    expectStanding(warningsOf(table([council(), second]), second), 'componentExhausted');
  });

  // LRR 53.3 with 53.2: the card is in the play area of the player who controls the planet.
  // Checks: named by a player who does not control Mecatol Rex, it is warned of as not held.
  test.fails('legendary:mrte used without controlling Mecatol Rex is warned of as not held', () => {
    const entry = council();
    expectStanding(warningsOf(table([entry], { control: false }), entry), 'componentNotHeld');
  });

  test.fails('legendary:mrte is a play effect that checks its condition', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
