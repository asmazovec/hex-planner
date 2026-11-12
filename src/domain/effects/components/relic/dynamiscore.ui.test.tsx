import { expect, test } from 'vitest';
import { showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, endOf, quote } from '../kit';
import { id } from './dynamiscore';

uiBench();

const TURN = componentAction(id);

// "ACTION: Gain trade goods equal to your commodity value, then purge this card."
// Checks: the component action of Dynamis Core is open in the editor, and the plan counts 6 trade goods and the purge.
// Why it is counted here: a play of the component action; the trade goods are the board's own number.
test('relic:dynamiscore the action shows in the editor and the plan counts the trade goods', () => {
  const core = bench({ faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries: [TURN] });
  quote(core.pack, id, 'Gain trade goods equal to your commodity value');
  const live = showTurn(core, TURN);
  expect(document.body.textContent).toContain('Dynamis Core');
  const end = endOf({ pack: core.pack, game: live.game() });
  expect(end.tradeGoods).toBe(6);
  expect(end.holdings.relics).not.toContain(id);
});
