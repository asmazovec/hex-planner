import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './nekroagent';

const RIVAL = 'o1';
const table = (entries: Entry[], faction = 'nekro') => bench({
  faction, expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries,
  game: { opponents: [{ id: RIVAL, faction: 'rules-tester', vp: 0, seat: 2, color: 2 }] },
});
const agent = (choices: Record<string, string>) => componentAction(id, { choices } as Partial<Entry>);

describe('leader:nekroagent Nekro Malleon', () => {
  // "You may exhaust this card to choose a player: that player may discard 1 action card or spend 1 command token from
  //  their command sheet to gain 2 trade goods."
  // Checks: I choose myself and spend a token of my strategy pool: the pool goes from 2 to 1 and I gain 2 trade goods.
  // Why the default count does not apply: nothing in the rules turns a command token into trade goods; the agent's
  // choices are counted as its text says (a `play`).
  test('leader:nekroagent on myself: a strategy token is spent for 2 trade goods', () => {
    const game = table([agent({ player: 'me', pay: 'token', pool: 'strategy' })]);
    quote(game.pack, id, 'spend 1 command token from their command sheet to gain 2 trade goods');
    const end = endOf(game);
    expect(end.strategy).toBe(1);
    expect(end.tradeGoods).toBe(2);
  });

  // "... that player may discard 1 action card ..."
  // Checks: I choose myself and discard the action card in my hand (entered in `spends`): my pools stay and I gain 2
  // trade goods.
  // Why the default count does not apply: the discard pays for the trade goods instead of the token.
  test('leader:nekroagent on myself: an action card discarded for 2 trade goods, the pools untouched', () => {
    const card = 'actionCard:bribery';
    const play = { ...agent({ player: 'me', pay: 'actionCard' }), spends: [card] };
    const game = bench({ faction: 'nekro', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' }, hand: [card] }, entries: [play] });
    const end = endOf(game);
    expect(end.tradeGoods).toBe(2);
    expect([end.tactic, end.fleet, end.strategy]).toEqual([3, 3, 2]);
    expect(end.holdings.hand).not.toContain(card);
  });

  // "... to choose a player: that player ..."
  // Checks: I choose the rival, who spends a tactic token and gains the 2 trade goods; my own board does not change.
  // Why the default count does not apply: the chosen player is the one who pays and gains.
  test('leader:nekroagent on a rival: the rival pays the token and gains the trade goods', () => {
    const game = table([agent({ player: RIVAL, pay: 'token', pool: 'tactic' })]);
    const end = endOf(game);
    expect(end.rivals?.[RIVAL]?.tactic).toBe(2);
    expect(end.rivals?.[RIVAL]?.tradeGoods).toBe(2);
    expect(end.tradeGoods).toBe(0);
  });

  // LRR 51.4 with "exhaust this card": an agent is exhausted by its use.
  // Checks: a second use in the same round is warned of as exhausted.
  // Why the check is NOT redundant here: the agent is ready once a round.
  test('leader:nekroagent is exhausted by its use: a second use in the round is warned of', () => {
    const again = agent({ player: 'me', pay: 'token', pool: 'strategy' });
    const game = table([agent({ player: 'me', pay: 'token', pool: 'strategy' }), again]);
    expectStanding(warningsOf(game, again), 'componentExhausted');
  });

  // Checks: the agent of the Nekro Virus played by another faction is warned of as not held.
  // Why the check is NOT redundant here: the agent is the Nekro player's; another faction does not hold it.
  test('leader:nekroagent not held: its play is warned of', () => {
    const play = agent({ player: 'me', pay: 'token', pool: 'strategy' });
    const game = bench({ faction: 'sol', expansions: ['pok'], entries: [play] });
    expectStanding(warningsOf(game, play), 'componentNotHeld');
  });

  test('leader:nekroagent is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
