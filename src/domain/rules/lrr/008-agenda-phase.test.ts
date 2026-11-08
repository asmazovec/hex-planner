/** LRR 8 Agenda Phase. Source: tirules2 rules-reference/agenda-phase.md. Voting is not modelled; the phase is a place for entries. */
import { describe, expect, test } from 'vitest';
import type { Entry } from '../../types';
import { codesOf, rulesGame, rulesPack } from '../kit';

const pack = rulesPack();

/** An expedition with no slice: a plain spending of planets, in any phase. */
const spend = (id: string, phase: Entry['phase'], planets: string[]): Entry =>
  ({ id, phase, status: 'planned', type: 'expedition', sliceId: null, payment: { planets, tradeGoods: 0 } });

describe('LRR 8 Agenda Phase', () => {
  test.todo('8.1: the agenda phase is skipped until the custodians token leaves Mecatol Rex — not modelled: every round has an agenda phase to plan in');
  test.todo('8.2: first agenda — not modelled: agendas are not');
  test.todo('8.2.1: the speaker reveals the agenda — not modelled: agendas are not');
  test.todo('8.2.2: players vote clockwise from the speaker\'s left — not modelled: voting is not');
  test.todo('8.2.3: the outcome with most votes is resolved — not modelled: voting is not');
  test.todo('8.3: the same again for a second agenda — not modelled: agendas are not');

  test('8.4: planets are readied at the end of the agenda phase, and the next round starts with the strategy phase', () => {
    const next = spend('next', 'strategy', ['h1']);
    const game = rulesGame({ rounds: [[spend('vote', 'agenda', ['h1'])], [next]] });
    expect(codesOf(game, pack, next)).not.toContain('planetExhausted');
  });

  test.todo('8.5: voting heading — not modelled: voting is not');
  test.todo('8.6: votes come from exhausting planets, by their influence — not modelled: voting is not');
  test.todo('8.6.1: an exhausted planet gives all its votes — not modelled: voting is not');
  test.todo('8.6.2: space stations, The Triad and Oceans vote by influence too — not modelled: voting is not');
  test.todo('8.7: all of a player\'s votes go to one outcome — not modelled: voting is not');
  test.todo('8.8: "For" or "Against" — not modelled: voting is not');
  test.todo('8.9: elections name an eligible player or planet — not modelled: voting is not');
  test.todo('8.10: a player may vote for themselves — not modelled: voting is not');
  test.todo('8.10.1: the elected player has most votes — not modelled: voting is not');
  test.todo('8.11: an elected planet must be controlled by a player — not modelled: voting is not');
  test.todo('8.11.1: the elected planet has most votes — not modelled: voting is not');
  test.todo('8.12: votes are declared aloud — not modelled: voting is not');
  test.todo('8.13: trade goods cannot be spent on votes — not modelled: voting is not');
  test.todo('8.14: a player may abstain — not modelled: voting is not');
  test.todo('8.15: extra votes go to the same outcome — not modelled: voting is not');
  test.todo('8.16: a player barred from voting casts no votes at all — not modelled: voting is not');
  test.todo('8.17: outcomes heading — not modelled: agendas are not');
  test.todo('8.18: the speaker follows the card to resolve the outcome — not modelled: agendas are not');
  test.todo('8.19: ties and no votes are decided by the speaker — not modelled: voting is not');
  test.todo('8.19.1: the speaker\'s decision is no vote — not modelled: voting is not');
  test.todo('8.20: a law elected or passed "For" stays in play — not modelled: agendas are not');
  test.todo('8.21: a directive or a law voted "Against" is discarded — not modelled: agendas are not');
  test.todo('8.22: predicting an outcome is done after the reveal, before any vote — not modelled: agendas are not');
  test.todo('8.22.1: a prediction must be a possible outcome — not modelled: agendas are not');
  test.todo('8.22.2: prediction abilities resolve after the outcome — not modelled: agendas are not');
  test.todo('8 note 1: zero votes is abstaining — not modelled: voting is not');
  test.todo('8 note 2: voting is not the player\'s turn — not modelled: turns are not');
  test.todo('8 note 3: outcomes affecting several players go in speaker order — not modelled: agendas are not');
  test.todo('8 note 4: riders resolve after the agenda in speaker order — not modelled: agendas are not');
  test.todo('8 note 5: several riders of one player resolve one at a time — not modelled: agendas are not');
  test.todo('8 note 6: each pair of players may make one transaction per agenda — not modelled: transactions are not');
  test.todo('8 note 7: only planets ready at the end of the phase, not other cards — not modelled: other cards are not exhausted in the app');
  test.todo('8 note 8: points to the notes on single agendas — nothing to test');
});
