/**
 * The component action of a turn (`TurnEditor`) over the bench, for the interface tests of the action cards of batch
 * 20, as `showFlight` shows a flight. Pass 2 moves it to src/ui/testing/effects.tsx as `showTurn`, `play` and
 * `choose`, beside the others, and gives `TurnEditor` the `onChoices` it passes here.
 *
 *   const live = showTurn(table, componentAction(undefined));   // an empty component action
 *   await play('Mining Initiative');                            // «Choose the component», found by its name
 *   await choose('Home One');                                   // a choice the card asks for, as a radio button
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useGame } from '../../../../state/gameStore';
import type { Live } from '../../../../ui/testing/effects';
import { TurnEditor, type TurnEditorProps } from '../../../../ui/plan/editors/TurnEditor';
import { project, stateBeforeEntry } from '../../../project';
import type { Entry, EntryBody, Game } from '../../../types';
import type { Bench } from '../kit';

type ComponentEntry = Extract<Entry, { type: 'component' }>;

const entryOf = (game: Game, id: string): Entry => game.plans[0].rounds.flatMap(round => round.entries).find(e => e.id === id)!;
const withEntry = (game: Game, entry: Entry): Game => ({
  ...game,
  plans: game.plans.map(plan => ({ ...plan, rounds: plan.rounds.map(round => ({ ...round, entries: round.entries.map(e => (e.id === entry.id ? entry : e)) })) })),
});

/** The editor of a component action, replayed anew after every change of the entry. */
export function showTurn(bench: Bench, entry: Entry): Live<ComponentEntry> {
  let current = bench.game;
  const warningsNow = () => project(current, current.plans[0], 'forecast', bench.pack).warningsByEntry[entry.id] ?? [];
  function Host() {
    const [game, setGame] = useState(bench.game);
    current = game;
    const shown = entryOf(game, entry.id) as ComponentEntry;
    const update = (patch: Partial<EntryBody>) => setGame(now => {
      const next = withEntry(now, { ...entryOf(now, entry.id), ...patch } as Entry);
      useGame.setState({ game: next });
      return next;
    });
    const board = stateBeforeEntry(game, game.plans[0], entry.id, bench.pack);
    const warnings = project(game, game.plans[0], 'forecast', bench.pack).warningsByEntry[entry.id] ?? [];
    // What pass 2 adds to the editor: the choices the played card asks for.
    const choices = { onChoices: (next: Record<string, string | number>) => update({ choices: next } as Partial<EntryBody>) } as unknown as Partial<TurnEditorProps>;
    const nothing = () => undefined;
    return (
      <TurnEditor
        entry={shown} game={game} pack={bench.pack} board={board} warnings={warnings} common={null}
        onNote={note => update({ note } as Partial<EntryBody>)} onComponent={componentId => update({ componentId } as Partial<EntryBody>)}
        onDone={nothing} onRemove={nothing} {...choices}
      />
    );
  }
  useGame.setState({ game: bench.game });
  render(<Host />);
  return { entry: () => entryOf(current, entry.id) as ComponentEntry, warnings: warningsNow, game: () => current };
}

/** Chooses the component the action plays: opens the choice, finds it by its name, takes it. */
export async function play(name: string): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Choose the component' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), name);
  await userEvent.click(await screen.findByRole('button', { name: `Choose ${name}` }));
}

/** Takes one of the choices the played card asks for: a planet, a player, a law, a ship, by its name. */
export const choose = (name: string | RegExp): Promise<void> => userEvent.click(screen.getByRole('radio', { name }));
