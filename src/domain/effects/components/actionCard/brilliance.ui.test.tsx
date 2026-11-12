import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';
import { TurnEditor } from '../../../../ui/plan/editors/TurnEditor';
import { project, stateBeforeEntry } from '../../../project';
import type { Entry } from '../../../types';
import { bench, componentAction, HOME, quote, tactical, type Bench } from '../kit';
import { id } from './brilliance';

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

// "Ready 1 of your planets that has a technology specialty"
// Checks: the editor of the component action that plays the card offers my exhausted planet with a specialty, and a
// press chooses it (the editor of a played card's choices does not exist yet: pass 2 builds it).
// Why the check is redundant here: nothing is lifted; the player must be able to say which planet the card readies.
test.fails('actionCard:brilliance the component action offers the exhausted Home One to ready', async () => {
  const entry = componentAction(id) as ComponentEntry;
  const table = bench({
    faction: 'sol', expansions: ['te'], start: { hand: [id] },
    entries: [tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } }), entry],
    game: { docks: ['h1'], planetControl: { h1: 'me' } },
    edit: pack => { pack.planets.h1 = { ...pack.planets.h1, tech: ['cybernetic'] }; },
  });
  quote(table.pack, id, 'Ready 1 of your planets that has a technology specialty');
  showTurn(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'Ready Home One' }));
});
