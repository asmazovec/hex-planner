/** LRR 23 Component Limitations. Source: tirules2 rules-reference/component-limitations.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { codesOf, HOME, primary, rulesGame, rulesPack, statusTokens, tactical } from '../kit';

const pack = rulesPack();

describe('LRR 23 Component Limitations', () => {
  test.todo('23.1: dice are limitless — not modelled: no dice are rolled');

  test('23.2 / 23 note 5: command tokens are limited to the sixteen of a faction: gaining a seventeenth is warned about', () => {
    // 3 + 3 + 2 in the pools at the start; Leadership 3 and the status phase 2, twice, make 18.
    const last = statusTokens(2, 0, 0);
    const game = rulesGame({
      rounds: [
        [primary(CARD.leadership, { tokens: { tactic: 3 } }), statusTokens(2, 0, 0)],
        [primary(CARD.leadership, { tokens: { tactic: 3 } }), last],
      ],
    });
    expect(codesOf(game, pack, last)).toContain('noReinforcements');
  });

  test.todo('23.3: depleted unlimited tokens may be replaced by a substitute — not modelled: physical tokens');

  test('23.4: fighters and ground forces are not limited: producing them is not warned about as running out', () => {
    const build = tactical(HOME, { production: { infantry: 4 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [build], game: { docks: ['h1'] } }), pack, build)).toEqual([]);
  });

  test.todo('23.4.1: with none in reinforcements a unit may be taken from a system without the player\'s command token — not modelled: reinforcements of ships are not counted');
  test.todo('23.4.2: fighter and infantry tokens stand in for plastic pieces, with at least one piece beside them — not modelled: pieces and tokens are not told apart');
  test.todo('23.5: an empty deck is reshuffled from its discard pile — not modelled: no decks');
  test.todo('23 note 1: plastic pieces cap fighters at ten systems and infantry at twelve places — not modelled: pieces and tokens are not told apart');
  test.todo('23 note 2: plastic fighters and infantry may be swapped for tokens at any time — not modelled: pieces and tokens are not told apart');
  test.todo('23 note 3: tokens of value three and one may be swapped — not modelled: physical tokens');
  test.todo('23 note 4: a deploy ability places only a unit from reinforcements — not modelled: deploy abilities are not planned');
  test.todo('23 note 6: purged cards do not return when a discard pile is reshuffled — not modelled: no decks');
  test.todo('23 note 7: a unit taken from the board for lack of reinforcements is placed undamaged — not modelled: damage is not tracked');
  test.todo('23 note 8: a replacement unit may be taken from a system without the player\'s command token — not modelled: reinforcements of ships are not counted');
});
