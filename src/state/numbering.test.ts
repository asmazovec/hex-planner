import { describe, expect, test } from 'vitest';
import { tacticalNumbers } from '../domain/route';
import { primary, rulesGame, rulesPack, tactical, TARGET, NEAR } from '../domain/rules/kit';
import { tableOf } from './fromLegacy';
import { statusOf, turnNumbers } from './numbering';
import { planOf } from './timeline';

const te = rulesPack(undefined, ['pok', 'te']);
const move = { moves: [{ from: NEAR, units: { cruiser: 1 } }] };

describe('the numbers and statuses of the turns of a round', () => {
  test('they agree with the old count: a player\'s own circle, the cancelled one left out, Warfare\'s action at its card', () => {
    const warfare = primary(6, {}, {});
    const free = tactical(TARGET, move, { fromCard: warfare.id, status: 'done' });
    const entries = [tactical(TARGET, move), { ...warfare, status: 'planned' as const }, free, { ...tactical(TARGET, move), status: 'cancelled' as const }, tactical(TARGET, move)];
    const game = rulesGame({ entries });
    const table = tableOf(game);
    const turns = planOf(table, game.plans[0], te)[0].turns;
    const numbers = turnNumbers(turns);
    const old = tacticalNumbers(game.plans[0].rounds[0].entries);
    expect(Object.values(numbers).sort()).toEqual(Object.values(old).sort());
    expect(Object.keys(numbers)).toEqual(Object.keys(old).filter(id => id in numbers));
    expect(numbers[free.id]).toBe(old[free.id]);
    expect(statusOf(turns, free.id)).toBe('planned');
  });
});
