import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './brilliance';

/** A cruiser bought at home with Home One and Home Two, which leaves both exhausted. */
const spend = () => tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
/** Home One has a technology specialty on this board; Home Two has none. */
const table = (entries: Entry[]) => bench({
  faction: 'sol', expansions: ['te'], start: { hand: [id] }, entries: [spend(), ...entries],
  game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } },
  edit: pack => { pack.planets.h1 = { ...pack.planets.h1, tech: ['cybernetic'] }; },
});
const brilliance = (planet: string) => componentAction(id, { choices: { planet } });

describe('actionCard:brilliance Brilliance', () => {
  // "Ready 1 of your planets that has a technology specialty"
  // Checks: Home One, exhausted by the purchase before, is ready after the card.
  // Why the check is redundant here: nothing is lifted; the card readies a planet, which the replay must do itself
  // (a planet is otherwise readied in the status phase, LRR 71.5, or by a strategy card).
  test.fails('actionCard:brilliance readies a planet with a technology specialty', () => {
    const ready = table([brilliance('h1')]);
    quote(ready.pack, id, 'Ready 1 of your planets that has a technology specialty');
    expect(endOf(ready).exhausted).not.toContain('h1');
    expect(endOf(ready).exhausted).toContain('h2');
  });

  // "... 1 of your planets that has a technology specialty ..."
  // Checks: Home Two has no specialty; choosing it is warned of (a new code).
  // Why the check is NOT redundant here: the card readies only a planet with a technology specialty.
  test.fails('actionCard:brilliance a planet without a technology specialty is warned of', () => {
    const entry = brilliance('h2');
    expectStanding(warningsOf(table([entry]), entry), 'playTargetInvalid' as AnyWarningCode);
  });

  // "... 1 of your planets ..." LRR 71 with the check of strategy cards: a planet I do not control is not mine to ready.
  // Checks: Target One, not mine, is warned of as any planet readied without control.
  // Why the check is NOT redundant here: the card readies my own planets only.
  test.fails('actionCard:brilliance a planet I do not control is warned of', () => {
    const entry = brilliance('t1');
    expectStanding(warningsOf(table([entry]), entry), 'readyNotControlled');
  });

  // Checks: the card only held leaves the planets exhausted.
  // Why the check is NOT redundant here: the card is an ACTION; until it is played nothing is readied.
  test('actionCard:brilliance held but not played readies nothing', () => {
    expect(endOf(table([])).exhausted).toEqual(expect.arrayContaining(['h1', 'h2']));
  });

  test.todo('actionCard:brilliance "choose 1 player to gain their breakthrough": a player holds only their own faction\'s breakthrough, another one cannot be held yet');

  test.fails('actionCard:brilliance is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
