import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';
import { TurnEditor } from '../../../../ui/plan/editors/TurnEditor';
import { project, stateBeforeEntry } from '../../../project';
import type { Entry } from '../../../types';
import { adjust, bench, componentAction, quote, type Bench } from '../kit';
import { id } from './mercenarycontract';

uiBench();

type ComponentEntry = Extract<Entry, { type: 'component' }>;

/** The editor of a component action over the bench, as the plan shows it. */
function showTurn(table: Bench, entry: ComponentEntry): void {
  const plan = table.game.plans[0];
  const board = stateBeforeEntry(table.game, plan, entry.id, table.pack);
  const warnings = project(table.game, plan, 'forecast', table.pack).warningsByEntry[entry.id] ?? [];
  const nothing = () => undefined;
  render(<TurnEditor entry={entry} game={table.game} pack={table.pack} board={board} warnings={warnings} common={null} onNote={nothing} onComponent={nothing} onDone={nothing} onRemove={nothing} />);
}

// "Spend 2 trade goods to place 2 neutral infantry on any non-home planet that contains no units"
// Checks: the editor of the component action that plays the card offers the planets where the infantry may go, and a
// press chooses Target One (the editor of a played card's choices does not exist yet: pass 2 builds it).
// Why the check is redundant here: nothing is lifted; the player must be able to say where the card places them.
test.fails('actionCard:mercenarycontract the component action offers Target One for the neutral infantry', async () => {
  const entry = componentAction(id) as ComponentEntry;
  const table = bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] }, entries: [adjust({ tradeGoods: 2 }), entry] });
  quote(table.pack, id, 'place 2 neutral infantry on any non-home planet');
  showTurn(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'Place on Target One' }));
});
