import { describe, expect, test } from 'vitest';
import type { Act, Entry, Opponent } from '../../../types';
import { adjust, bench, componentAction, effect, endOf, expectNone, expectStanding, expectWaived, FARTHER, HOME, quote, tactical, using, warningsOf } from '../kit';
import { id } from './tcs';

const MERCER = 'leader:nomadagentmercer';
const THUNDARIAN = 'leader:nomadagentthundarian';
const AGENTS = { [MERCER]: 'unlocked', [THUNDARIAN]: 'unlocked' } as const;

const nomad = (entries: Entry[], technologies = [id]) =>
  bench({ faction: 'nomad', expansions: ['pok'], start: { leaders: { ...AGENTS }, technologies }, entries });

/** A rival far down the row: not my neighbour. */
const RIVAL: Opponent = { id: 'o1', faction: 'naaz', vp: 0, seat: 2, color: 2 };
const deal: Act = { kind: 'transaction', with: 'o1', give: { tradeGoods: 1 }, get: {} };
const withRival = (turn: Entry, technologies = [id]) => bench({
  faction: 'nomad', expansions: ['pok'], start: { technologies }, entries: [adjust({ tradeGoods: 2 }), turn],
  game: { opponents: [RIVAL], enemyUnits: { [FARTHER]: { o1: { carrier: 1 } } } },
});

describe('technology:tcs Temporal Command Suite', () => {
  // "After any player's agent becomes exhausted, you may exhaust this card to ready that agent"
  // Checks: Mercer is used with the card named beside it; Mercer is ready after the entry, so its next use is not
  // warned of, and the card itself is exhausted.
  // Why the check is redundant here: the exhausted agent (51.4) is readied by the card at once, so the second use finds
  // it ready.
  test('technology:tcs readies the agent exhausted with it: the next use finds it ready', () => {
    const later = componentAction(MERCER);
    const table = nomad([using(componentAction(MERCER), id), later]);
    quote(table.pack, id, 'you may exhaust this card to ready that agent');
    expectNone(warningsOf(table, later), 'componentExhausted');
    expect(endOf(table).holdings.exhausted).toContain(id);
  });

  // LRR 51.4: an agent is exhausted by its use and readied in the status phase.
  // Checks: without the card named, the second use of Mercer stands warned of.
  // Why the check is NOT redundant here: nothing readied the agent.
  test('technology:tcs not named, the second use of the agent is warned of', () => {
    const later = componentAction(MERCER);
    expectStanding(warningsOf(nomad([componentAction(MERCER), later]), later), 'componentExhausted');
  });

  // "... you may exhaust this card ..." (34.4: an exhausted card cannot be used until it is readied)
  // Checks: the card readied Mercer once; named again with The Thundarian it is exhausted and is warned of, and The
  // Thundarian stays exhausted for its next use.
  // Why the check is NOT redundant here: an exhausted card does nothing until the status phase.
  test('technology:tcs exhausted, it is warned of and readies nothing more', () => {
    const second = using(componentAction(THUNDARIAN), id);
    const later = componentAction(THUNDARIAN);
    const table = nomad([using(componentAction(MERCER), id), second, later]);
    expectStanding(warningsOf(table, second), 'componentExhausted');
    expectStanding(warningsOf(table, later), 'componentExhausted');
  });

  // Checks: held by nobody, the card readies nothing: the agent stays exhausted.
  test('technology:tcs not researched, naming it readies nothing', () => {
    const later = componentAction(MERCER);
    const table = nomad([using(componentAction(MERCER), id), later], []);
    expectStanding(warningsOf(table, later), 'componentExhausted');
  });

  // "... if you ready another player's agent, you may perform a transaction with that player." Ruling (Nomad, Temporal
  //  Command Suite 1): "The Nomad player may perform a transaction with another player without being neighbors with
  //  that player."
  // Checks: a transaction with a rival far away, in an entry that names the card, is warned of as not with a
  // neighbour, and the warning is lifted by the card.
  // Why the check is redundant here: transactions are with neighbours (94.1, 60.1), and the card gives one with the
  // player whose agent it readied, wherever they are.
  test('technology:tcs a transaction with a player who is not a neighbour: the warning is waived', () => {
    const turn = using(tactical(HOME, { acts: [deal] }), id);
    const table = withRival(turn);
    quote(table.pack, id, 'if you ready another player\'s agent, you may perform a transaction with that player');
    expectWaived(warningsOf(table, turn), 'notNeighbor', id);
  });

  // Ruling (Nomad, Temporal Command Suite 3): "Temporal Command Suite may allow the Nomad player to perform a second
  //  transaction with another player during one turn, before or after the regular transaction."
  // Checks: two transactions with the same rival in a turn that names the card: the repeat is lifted by the card.
  // Why the check is redundant here: one transaction per player per turn (94.1), and the card gives one more.
  test('technology:tcs a second transaction with the same player in a turn: the warning is waived', () => {
    const turn = using(tactical(HOME, { acts: [deal, deal] }), id);
    expectWaived(warningsOf(withRival(turn), turn), 'transactionRepeated', id);
  });

  // LRR 94.1: "During the active player's turn, they may resolve up to one transaction with each of their neighbors."
  // Checks: the same transaction without the card named stands warned of.
  // Why the check is NOT redundant here: no agent was readied, so the card gives no transaction.
  test('technology:tcs not named, a transaction with a player who is not a neighbour is warned of', () => {
    const turn = tactical(HOME, { acts: [deal] });
    expectStanding(warningsOf(withRival(turn), turn), 'notNeighbor');
  });

  test('technology:tcs is a play effect that waives the transaction checks', () => {
    const { pack } = nomad([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
    expect(effect(pack, id).permit?.map(w => w.code).sort()).toEqual(['notNeighbor', 'transactionRepeated']);
  });
});
