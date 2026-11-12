import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';
import { TurnEditor } from '../../../../ui/plan/editors/TurnEditor';
import { project, stateBeforeEntry } from '../../../project';
import type { Entry } from '../../../types';
import { adjust, bench, componentAction, quote, type Bench } from '../kit';
import { id } from './refit';

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

// "Choose 1 or 2 of your infantry on the game board. Replace each of those infantry with mechs."
// Checks: the editor of the component action that plays the card offers my infantry by planet, and a press chooses one
// to replace (the editor of a played card's choices does not exist yet: pass 2 builds it and the change of choices).
// Why the check is redundant here: nothing is lifted; the player must be able to say which infantry the card replaces.
test.fails('actionCard:refit the component action offers the infantry of Home One to replace with a mech', async () => {
  const entry = componentAction(id) as ComponentEntry;
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] }, entries: [adjust({ ground: { h1: { infantry: 2 } } }), entry], game: { planetControl: { h1: 'me' } } });
  quote(table.pack, id, 'Choose 1 or 2 of your infantry on the game board.');
  showTurn(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'Replace one Infantry on Home One' }));
});
