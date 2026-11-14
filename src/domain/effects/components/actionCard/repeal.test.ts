import { describe, expect, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './repeal';

/** LRR 2.6.1 in a file of its own (pass 2): a component action whose ability cannot be resolved completely. */
const UNRESOLVED = 'componentUnresolved' as AnyWarningCode;
const LAW = 'agenda:conventions';

/** Conventions of War is put in play by an entry of the agenda before the card is played. */
const enacted = (): Entry => ({ ...adjust({}), gains: [LAW] });
const repeal = (law?: string) => componentAction(id, law === undefined ? {} : { choices: { law } });
const table = (entries: Entry[], hand: string[] = [id]) => bench({ faction: 'sol', start: { hand }, entries });

describe('actionCard:repeal Repeal Law', () => {
  // "Discard 1 law from play."
  // Checks: played with the choice of Conventions of War, the law leaves play for the whole game.
  // Why no check is lifted: discarding a law breaks no rule; the laws in play are what the plan counts.
  test('actionCard:repeal discards the law chosen from play', () => {
    const play = repeal(LAW);
    const card = table([enacted(), play]);
    quote(card.pack, id, 'Discard 1 law from play');
    expect(endOf(card).laws ?? []).not.toContain(LAW);
    expectNone(warningsOf(card, play), UNRESOLVED);
  });

  // tirules2, Repeal Law 1: "There must be at least one law in play for a player to play and resolve Repeal Law."
  // Checks: with no law in play the play is warned of.
  // Why the check is NOT redundant here: LRR 2.6.1, a component action that cannot be resolved completely is not
  // resolved; the card does not say otherwise.
  test('actionCard:repeal without a law in play is warned of', () => {
    const play = repeal(LAW);
    expectStanding(warningsOf(table([play]), play), UNRESOLVED);
  });

  // Checks: the law put in `spends` of the same entry by hand is discarded today: what the play automates.
  // Why this holds already: a law lost by an entry leaves play for the whole game (src/domain/replay/holdings.ts, `lose`).
  test('actionCard:repeal a law discarded by hand with the card leaves play', () => {
    const card = table([enacted(), { ...componentAction(id), spends: [LAW] }]);
    expect(endOf(card).laws ?? []).not.toContain(LAW);
  });

  // Checks: without a law chosen, the law stays.
  // Why the law is NOT discarded: the card names one law; none was chosen.
  test('actionCard:repeal without a law chosen discards nothing', () => {
    expect(endOf(table([enacted(), repeal()])).laws).toContain(LAW);
  });

  test('actionCard:repeal is a play effect that waives nothing', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
