import { describe, expect, test } from 'vitest';
import type { Entry, Game } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, expectWaived, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './xxchaagent';

/** h1 is exhausted by paying for two infantry at the home dock. */
const spendH1 = () => tactical(HOME, { production: { infantry: 2 }, payment: { planets: ['h1'], tradeGoods: 0 } });
const ready = (planet: string) => componentAction(id, { choices: { planet } });
const table = (entries: Entry[], game: Partial<Game> = {}) =>
  bench({ faction: 'xxcha', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries, game: { docks: ['h1'], ...game } });

describe('leader:xxchaagent Ggrocuto Rinn', () => {
  // "ACTION: Exhaust this card to ready any planet"
  // Checks: h1, exhausted by a payment, is readied by the agent's component action.
  // Why this is the component's own: a planet is readied in the status phase (81.6) or by an effect that says so.
  test.fails('leader:xxchaagent readies the planet chosen', () => {
    const xxcha = table([spendH1(), ready('h1')]);
    quote(xxcha.pack, id, 'Exhaust this card to ready any planet');
    expect(endOf(xxcha).exhausted).not.toContain('h1');
  });

  // "... ready any planet ..."
  // Checks: readying t1, another player's planet, is listed as the rule that only one's own planets are readied, and
  // lifted by the agent.
  // Why the check is redundant here: LRR 71 note 3 limits a readying effect to the player's planets, the agent says
  // any planet (ruling 2: a planet that is exhausted).
  test.fails('leader:xxchaagent readies another player\'s planet: readyNotControlled is waived', () => {
    const action = ready('t1');
    expectWaived(warningsOf(table([action], { planetControl: { t1: 'enemy' } }), action), 'readyNotControlled', id);
  });

  // Checks: without the agent's action h1 stays exhausted to the end of the round.
  test('leader:xxchaagent not used, the planet stays exhausted', () => {
    expect(endOf(table([spendH1()])).exhausted).toContain('h1');
  });

  // "Exhaust this card ..." LRR 51.4 / 34.1.
  // Checks: a second action of the exhausted agent in the round is warned of.
  test('leader:xxchaagent is exhausted by its action: a second one in the round is warned of', () => {
    const again = ready('h1');
    expectStanding(warningsOf(table([ready('h2'), again]), again), 'componentExhausted');
  });

  test.todo('leader:xxchaagent the infantry removed from a planet adjacent to the Xxcha: another player\'s ground forces on a planet are set by hand, not replayed');

  test.fails('leader:xxchaagent is a play effect that waives readying another player\'s planet', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['readyNotControlled']);
  });
});
