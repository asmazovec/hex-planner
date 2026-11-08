/** LRR 61 Objective Cards. Source: tirules2 rules-reference/objective-cards.md. */
import { describe, expect, test } from 'vitest';
import type { Entry } from '../../types';
import { adjust, forecast, rulesGame, rulesPack, statusTokens } from '../kit';

const pack = rulesPack();
const scored = (vp: number, opponentVp?: Record<string, number>): Entry => ({ ...statusTokens(2, 0, 0), vp, ...(opponentVp ? { opponentVp } : {}) } as Entry);

describe('LRR 61 Objective Cards', () => {
  test.todo('61.1: objectives are public or secret — not modelled: objectives are not tracked, only the points');
  test.todo('61.1.1: public objectives have I or II on the back — not modelled: objectives are not tracked');

  test('61.2: scoring an objective gains its points: the points gained in a status phase are added', () => {
    const game = rulesGame({ rounds: [[scored(1)], [scored(2)]] });
    expect(forecast(game, pack).state.vp).toBe(3);
  });

  test('61.2: points gained in the action phase are added too', () => {
    expect(forecast(rulesGame({ entries: [adjust({ vp: 1 })] }), pack).state.vp).toBe(1);
  });

  test('61.2: an opponent\'s points are counted apart from mine', () => {
    const game = rulesGame({
      entries: [scored(1, { o1: 2 })],
      game: { vp: 1, opponents: [{ id: 'o1', faction: 'rules-tester', vp: 3, seat: 2, color: 2 }] },
    });
    const { state } = forecast(game, pack);
    expect(state.vp).toBe(2);
    expect(state.opponentVp.o1).toBe(5);
  });

  test.todo('61.3: each objective names the phase it is scored in — not modelled: objectives are not tracked');
  test.todo('61.4: each objective names its requirement — not modelled: objectives are not tracked');
  test.todo('61.5: a met requirement lets the objective be scored at its time — not modelled: requirements are not checked');
  test.todo('61.5.1: a status phase objective must be met in the Score Objectives step — not modelled: requirements are not checked');
  test.todo('61.5.2: an action phase objective may be scored at any time in that phase — not modelled: objectives are not tracked');
  test.todo('61.5.3: an agenda phase objective may be scored at any time in that phase — not modelled: the agenda phase is not planned');
  test.todo('61.6: at most one public and one secret objective per status phase — not modelled: points are entered without their objectives, so their number is unknown');
  test.todo('61.7: during the action phase only one objective per combat — not modelled: objectives are not tracked');
  test.todo('61.7.1: one objective may be scored in the space combat and one in the ground combat — not modelled: objectives are not tracked');
  test.todo('61.8: each objective is scored once a game — not modelled: objectives are not tracked');
  test.todo('61.9: "destroy" objectives count units destroyed by hits, cards or abilities — not modelled: objectives are not tracked');
  test.todo('61.9.1: units removed for the fleet pool are not destroyed — not modelled: objectives are not tracked');
  test.todo('61.10: some objectives are scored by spending resources, influence or tokens — not modelled: such a cost goes in by hand as an adjustment');
  test.todo('61.11: public objectives — heading only');
  test.todo('61.12: a scored public objective gets a control token and moves the points track — not modelled: objectives are not tracked, the points are');
  test.todo('61.13: five stage I and five stage II objectives are set out at setup — not modelled: objectives are not tracked');
  test.todo('61.13.1: two stage I objectives are revealed at setup — not modelled: objectives are not tracked');
  test.todo('61.14: the speaker reveals one objective each status phase — not modelled: objectives are not tracked');
  test.todo('61.14.1: stage II comes only after every stage I — not modelled: objectives are not tracked');
  test.todo('61.15: the game ends when an objective must be revealed and none is left — not modelled: the end of the game is not planned');
  test.todo('61.15.1: the most points wins, ties going by initiative order — not modelled: the end of the game is not planned');
  test.todo('61.16: a player without every home planet cannot score public objectives — not modelled: points are entered without their objectives, so a warning cannot tell public from secret');
  test.todo('61.17: secret objectives — heading only');
  test.todo('61.18: a scored secret objective is revealed and moves the points track — not modelled: objectives are not tracked, the points are');
  test.todo('61.19: a player scores only their own secret objectives — not modelled: objectives are not tracked');
  test.todo('61.20: everyone starts with one secret objective — not modelled: objectives are not tracked');
  test.todo('61.21: at most three secret objectives, scored or not — not modelled: objectives are not tracked');
  test.todo('61.21.1: a fourth drawn is returned, chosen among the unscored — not modelled: objectives are not tracked');
  test.todo('61.22: Imperial\'s primary or secondary draws secret objectives — not modelled: objectives are not tracked');
  test.todo('61 note 1: a status phase objective is met in the status phase, whatever the action phase did — not modelled: requirements are not checked');
  test.todo('61 note 2: any number of players may score one public objective — not modelled: objectives are not tracked');
  test.todo('61 note 3: the number of secret objectives in hand is public — not modelled: objectives are not tracked');
  test.todo('61 note 4: a player may show their secret objectives — not modelled: objectives are not tracked');
  test.todo('61 note 5: one secret objective per ground combat on each planet — not modelled: objectives are not tracked');
  test.todo('61 note 6: bombardment and space cannon lie outside combat for scoring — not modelled: objectives are not tracked');
  test.todo('61 note 6.1: anti-fighter barrage lies inside combat — not modelled: objectives are not tracked');
  test.todo('61 note 7: action phase secret objectives may be scored on another player\'s turn — not modelled: objectives are not tracked');
  test.todo('61 note 8: a player with three scored secrets may draw a fourth but shuffles it back — not modelled: objectives are not tracked');
  test.todo('61 note 9: notes on single objectives are elsewhere — not modelled: objectives are not tracked');
});
