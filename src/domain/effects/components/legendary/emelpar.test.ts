import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { before, bench, effect, expectNone, expectStanding, FAR, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './emelpar';

const AGENT = 'leader:letnevagent';

/**
 * An entry that exhausts the Acropolis at its end to ready `component`. The choice is written as the entry's `choices`
 * under `ready`; pass 2 decides where the choices of a used component live and changes only this helper.
 */
const readying = (entry: Entry, component: string): Entry => ({ ...using(entry, id), choices: { ready: component } }) as Entry;

/** The Letnev agent used in a first turn, then each entry of `rest`; the Acropolis controlled unless said otherwise. */
const table = (rest: Entry[], control = true) => {
  const first = using(tactical(NEAR), AGENT);
  return bench({
    faction: 'letnev', expansions: ['pok', 'te'], start: { leaders: { [AGENT]: 'unlocked' } }, entries: [first, ...rest],
    game: { planetControl: control ? { emelpar: 'me' } : {} },
  });
};

describe('legendary:emelpar The Acropolis', () => {
  // "You may exhaust this card at the end of your turn to ready another component that isn't a strategy card."
  // Checks: the agent exhausted in the first turn is readied by the Acropolis at the end of the second, so the third
  // turn uses it again with no warning that it is exhausted.
  // Why the check is redundant here: LRR 34.4 / 51.4 keep an exhausted agent unusable until the status phase readies
  // it; the card readies it now, so the check finds a ready agent.
  test('legendary:emelpar readies an exhausted agent: its next use is not warned of', () => {
    const third = using(tactical(FAR), AGENT);
    const game = table([readying(tactical(TARGET), AGENT), third]);
    quote(game.pack, id, 'ready another component that isn\'t a strategy card');
    expect(before(game.game, game.pack, third).holdings.leaders[AGENT]).toBe('unlocked');
    expectNone(warningsOf(game, third), 'componentExhausted');
  });

  // LRR 34.4: "When a player exhausts a card, they cannot exhaust that card again until it is readied."
  // Checks: without the Acropolis the agent used again in the round is warned of as exhausted.
  // Why the check is NOT redundant here: nothing readied the agent.
  test('legendary:emelpar not used: the agent used twice in a round is warned of as exhausted', () => {
    const third = using(tactical(FAR), AGENT);
    expectStanding(warningsOf(table([tactical(TARGET), third]), third), 'componentExhausted');
  });

  // "... to ready another component ..."
  // Checks: the Acropolis cannot ready itself: used again later in the round, it is warned of as exhausted.
  // Why the check is NOT redundant here: the card says "another"; the card exhausted for the effect stays exhausted.
  test('legendary:emelpar does not ready itself', () => {
    const again = using(tactical(FAR), id);
    expectStanding(warningsOf(table([readying(tactical(TARGET), id), again]), again), 'componentExhausted');
  });

  // LRR 53.3 with 53.2: the card is in the play area of the player who controls Emelpar.
  // Checks: named by a player who does not control Emelpar, it is warned of as not held.
  // Why the check is NOT redundant here: the card is not theirs to exhaust.
  test('legendary:emelpar used without controlling Emelpar is warned of as not held', () => {
    const second = readying(tactical(TARGET), AGENT);
    expectStanding(warningsOf(table([second], false), second), 'componentNotHeld');
  });

  test.todo('legendary:emelpar readies a component in another player\'s play area (Acropolis note 1): the plan readies only its owner\'s holdings');

  test('legendary:emelpar is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
