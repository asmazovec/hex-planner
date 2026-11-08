/** LRR 33 Elimination. Source: tirules2 rules-reference/elimination.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { codesOf, primary, rulesGame, rulesPack } from '../kit';

const pack = rulesPack();

describe('LRR 33 Elimination', () => {
  test.todo('33.1: a player is eliminated with no ground forces, no unit with Production and no planet — not modelled: elimination is not tracked');
  test.todo('33.1.1: the first condition, no ground forces on the board — not modelled: elimination is not tracked');
  test.todo('33.1.2: the second condition, no unit with Production — not modelled: elimination is not tracked');
  test.todo('33.1.3: the third condition, no planet controlled — not modelled: elimination is not tracked');
  test.todo('33.2: the eliminated player\'s components go back to the box — not modelled: elimination is not tracked');
  test.todo('33.3: their agenda cards are discarded — not modelled: agendas are not planned');
  test.todo('33.4: promissory notes of other players they hold go back to those players — not modelled: promissory notes are not planned');
  test.todo('33.4.1: their own promissory notes go back to the box, whoever holds them — not modelled: promissory notes are not planned');
  test.todo('33.5: their action cards are discarded — not modelled: action cards are not planned');
  test.todo('33.6: their strategy cards return to the common area — not modelled: elimination is not tracked');
  test.todo('33.7: their secret objectives are shuffled back — not modelled: objectives are not planned');
  test.todo('33.8: an eliminated speaker passes the token to the left — not modelled: the speaker is shown only');

  test('33.9: a game begun with five or more players keeps one strategy card each after eliminations', () => {
    // Only the player count set at the start decides it, not how many opponents are still listed.
    const second = primary(CARD.imperial);
    const game = rulesGame({ playerCount: 5, entries: [primary(CARD.trade), second], game: { opponents: [] } });
    expect(codesOf(game, pack, second)).toContain('primaryRepeated');
  });

  test.todo('33.10: faction components of an eliminated player follow special rules — not modelled: elimination is not tracked');
  test.todo('33.10.1: a Nekro-assimilated technology stays in play — not modelled: elimination is not tracked');
  test.todo('33.10.2: the Creuss wormhole tokens stay on the board — not modelled: elimination is not tracked');
  test.todo('33.10.3: the Naalu 0 token stays with its holder until the end of the status phase — not modelled: elimination is not tracked');
  test.todo('33.10.4: Titans attachments stay in play — not modelled: elimination is not tracked');
  test.todo('33.10.5: command tokens on an eliminated Mahact sheet go back to their owners — not modelled: elimination is not tracked');
  test.todo('33.10.6: an eliminated player\'s token on the Mahact sheet stays, and so does their unlocked commander — not modelled: elimination is not tracked');
  test.todo('33.11: units captured by an eliminated player return to their owners — not modelled: capture is not tracked');
  test.todo('33 note 1: a unit that produces without the Production ability does not prevent elimination — not modelled: elimination is not tracked');
  test.todo('33 note 2: an eliminated player\'s home system stays a home system — not modelled: elimination is not tracked');
  test.todo('33 note 3: relic fragments are discarded and relics purged — not modelled: relics are not planned');
  test.todo('33 note 4: units of an eliminated player held captive stay captive and later go to the box — not modelled: capture is not tracked');
});
