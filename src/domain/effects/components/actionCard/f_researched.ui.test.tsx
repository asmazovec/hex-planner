import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, componentAction, quote } from '../kit';
import { id } from './f_researched';

uiBench();

// "Spend 4 trade goods to research 1 technology"
// Checks: played with 3 trade goods, the component action shows the trade goods warning.
// Why the check is NOT redundant here: the card's cost is 4 trade goods and the player has 3 (ruling: it cannot be
// played then).
test('actionCard:f_researched with 3 trade goods shows the trade goods warning', () => {
  const play = componentAction(id, { choices: { technology: 'technology:nm' } } as never);
  const poor = bench({ faction: 'sol', start: { hand: [id] }, entries: [adjust({ tradeGoods: 3 }), play] });
  quote(poor.pack, id, 'Spend 4 trade goods');
  showWarnings(poor, play);
  expectShownStanding('shortTradeGoods');
});

// "... to research 1 technology"
test.todo('actionCard:f_researched the technology is chosen in the component action and joins the holdings: no editor of a component\'s choices yet');
