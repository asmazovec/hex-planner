import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';
import { TurnEditor } from '../../../../ui/plan/editors/TurnEditor';
import { project, stateBeforeEntry } from '../../../project';
import type { Entry } from '../../../types';
import { bench, componentAction, HOME, quote, type Bench } from '../kit';
import { id } from './scuttle';

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

// "Choose 1 or 2 of your non-fighter ships on the game board and return them to your reinforcements."
// Checks: the editor of the component action that plays the card offers my non-fighter ships by system, and a press
// chooses a cruiser (the editor of a played card's choices does not exist yet: pass 2 builds it).
// Why the check is redundant here: nothing is lifted; the player must be able to say which ships the card returns.
test.fails('actionCard:scuttle the component action offers the ships of the home system to return', async () => {
  const entry = componentAction(id) as ComponentEntry;
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] }, units: { [HOME]: { cruiser: 1 } }, entries: [entry] });
  quote(table.pack, id, 'return them to your reinforcements');
  showTurn(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'Return one Cruiser' }));
});
