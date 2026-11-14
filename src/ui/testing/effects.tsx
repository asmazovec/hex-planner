/**
 * The bench for the tests of the interface of one component (`<kind>/<slug>.ui.test.tsx` beside its effect file): the
 * real editors over the game of `bench` (src/domain/effects/components/kit.ts), kept alive so that every press goes
 * through the replay and the editor shows what the replay then says. The tests read the interface in English.
 *
 *   uiBench();                                        // once per file: English, and the screen cleared after each test
 *   const flight = showFlight(table, move, HOME);     // the flight step of a source: take units, structures
 *   await take('Mech');
 *   expectShownWaived('capacityGroup', 'Aerie Sentinel');
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, expect } from 'vitest';
import type { Bench } from '../../domain/effects/components/kit';
import { project, stateBeforeEntry, timelineOf } from '../../state/projection';
import type { KernelView } from '../plan/kernelView';
import type { AnyWarningCode, DataPack, Entry, EntryBody, Game, GameState, Warning } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { WarningList } from '../feedback/WarningText';
import { UsesBlock } from '../plan/blocks/UsesBlock';
import { ScoredBlock } from '../plan/blocks/ScoredBlock';
import { AdjustmentEditor } from '../plan/editors/AdjustmentEditor';
import { TacticalEditor } from '../plan/editors/TacticalEditor';
import { TurnEditor } from '../plan/editors/TurnEditor';
import { flightWarnings, UnitPicker } from '../plan/editors/UnitPicker';

type TacticalEntry = Extract<Entry, { type: 'tactical' }>;
type ComponentEntry = Extract<Entry, { type: 'component' }>;

/** Once per test file: the interface in English, and the screen cleared after each test. */
export function uiBench(): void {
  beforeEach(() => {
    setLanguage('en');
    document.elementFromPoint = () => null;
  });
  afterEach(cleanup);
}

/** What a live editor gives back to the test: the entry and its warnings as they stand after the presses so far. */
export interface Live<E extends Entry = Entry> {
  entry: () => E;
  warnings: () => Warning[];
  game: () => Game;
}

const withEntry = (game: Game, entry: Entry): Game => ({
  ...game,
  plans: game.plans.map(plan => ({ ...plan, rounds: plan.rounds.map(round => ({ ...round, entries: round.entries.map(e => (e.id === entry.id ? entry : e)) })) })),
});

const entryOf = (game: Game, id: string): Entry => game.plans[0].rounds.flatMap(round => round.entries).find(e => e.id === id)!;

interface Seen { game: Game; pack: DataPack; view: KernelView; entry: Entry; before: GameState; warnings: Warning[]; update: (patch: Partial<EntryBody>) => void }

/** Renders `view` over the game, replayed anew after every change of the entry. */
function live<E extends Entry>(bench: Bench, entry: E, view: (seen: Seen) => ReactNode): Live<E> {
  let current = bench.game;
  const warningsNow = () => project(current, current.plans[0], 'forecast', bench.pack).warningsByEntry[entry.id] ?? [];
  function Host() {
    const [game, setGame] = useState(bench.game);
    current = game;
    const shown = entryOf(game, entry.id);
    const update = (patch: Partial<EntryBody>) => setGame(now => {
      const next = withEntry(now, { ...entryOf(now, entry.id), ...patch } as Entry);
      useGame.setState({ game: next });
      return next;
    });
    const before = stateBeforeEntry(game, game.plans[0], entry.id, bench.pack);
    const warnings = project(game, game.plans[0], 'forecast', bench.pack).warningsByEntry[entry.id] ?? [];
    const { kernel } = timelineOf(game, game.plans[0], 'forecast', bench.pack);
    const at: KernelView = { table: kernel.table, board: kernel.byTurn.get(entry.id)?.before ?? kernel.end };
    return <>{view({ game, pack: bench.pack, view: at, entry: shown, before, warnings, update })}</>;
  }
  // The choice of a component reads the game from the store.
  useGame.setState({ game: bench.game });
  render(<Host />);
  return { entry: () => entryOf(current, entry.id) as E, warnings: warningsNow, game: () => current };
}

/** The flight step of one source of a tactical action (`UnitPicker`): who flies, what rides on board, with the warnings of that flight. */
export function showFlight(bench: Bench, entry: Entry, source: string): Live<TacticalEntry> {
  return live(bench, entry as TacticalEntry, ({ game, pack, view, entry: shown, before, warnings, update }) => (
    <UnitPicker
      game={game} pack={pack} view={view} before={before} entry={shown as TacticalEntry} source={source}
      warnings={flightWarnings(warnings, game, pack, shown as TacticalEntry, source)}
      onChange={moves => update({ moves } as Partial<EntryBody>)} onClose={() => undefined} onFly={() => undefined}
    />
  ));
}

/** The whole tactical editor of an entry, with «Used» as its common part: the landing, the result of the action, every block's warnings. */
export function showTactical(bench: Bench, entry: Entry): Live<TacticalEntry> {
  const nothing = () => undefined;
  return live(bench, entry as TacticalEntry, ({ game, pack, view, entry: shown, before, warnings, update }) => (
    <TacticalEditor
      game={game} pack={pack} view={view} entry={shown as TacticalEntry} before={before} warnings={warnings} manualPayment={false} choosing={null}
      onChoose={nothing} onUpdate={patch => update(patch as Partial<EntryBody>)} onOpenPicker={nothing} onManualPayment={nothing}
      onOpenShop={nothing} onOpenBattle={nothing} onOpenFleet={nothing} onDone={nothing} onRemove={nothing}
      common={<UsesBlock entry={shown} pack={pack} view={view} warnings={warnings} onChange={patch => update(patch as Partial<EntryBody>)} />}
    />
  ));
}

/** «Used» of any entry with every warning of the entry under it: what a component named there allows is seen at once. */
export function showUses(bench: Bench, entry: Entry): Live {
  return live(bench, entry, ({ pack, view, entry: shown, warnings, update }) => (
    <>
      <UsesBlock entry={shown} pack={pack} view={view} warnings={warnings} onChange={patch => update(patch as Partial<EntryBody>)} />
      <WarningList warnings={warnings} table={view.table} board={view.board} pack={pack} />
    </>
  ));
}

/**
 * The whole editor of a component action or a pass (`TurnEditor`) with its choices, the warnings and «Used» as its common part,
 * replayed anew after every press. Press `play` to name the component, `choose` to answer what it asks.
 *
 *   const live = showTurn(table, componentAction(undefined));
 *   await play('Mining Initiative');
 *   await choose('Home One');
 */
export function showTurn(bench: Bench, entry: Entry): Live<ComponentEntry> {
  const nothing = () => undefined;
  return live(bench, entry as ComponentEntry, ({ pack, view, entry: shown, warnings, update }) => (
    <TurnEditor
      entry={shown as ComponentEntry} pack={pack} view={view} warnings={warnings}
      common={<UsesBlock entry={shown} pack={pack} view={view} warnings={warnings} onChange={patch => update(patch as Partial<EntryBody>)} />}
      onNote={note => update({ note } as Partial<EntryBody>)} onComponent={componentId => update({ componentId, choices: undefined } as Partial<EntryBody>)}
      onChoices={choices => update({ choices: Object.keys(choices).length > 0 ? choices : undefined })}
      production={{ picking: false, onPick: nothing, onOpenShop: nothing, onChange: effects => update({ effects } as Partial<EntryBody>), manual: false, onManual: nothing }}
      onDone={nothing} onRemove={nothing}
    />
  ));
}

/** The same as `showTurn`: the editor of a component action with the choices its component asks. */
export const showComponent = showTurn;

/** The editor of an agenda entry of the agenda phase, live: the outcome and the election are pressed and the replay answers with the warnings under them. */
export function showAgenda(bench: Bench, entry: Entry): Live<Extract<Entry, { type: 'adjustment' }>> {
  const nothing = () => undefined;
  return live(bench, entry as Extract<Entry, { type: 'adjustment' }>, ({ pack, view, entry: shown, warnings, update }) => (
    <AdjustmentEditor
      pack={pack} view={view} entry={shown as Extract<Entry, { type: 'adjustment' }>} warnings={warnings} picking={false}
      onPickSystem={nothing} onOpenHex={nothing} onUpdate={patch => update(patch as Partial<EntryBody>)} onDone={nothing} onRemove={nothing}
    />
  ));
}

/** The objectives a status entry scores and what it cost, live, with every warning of the entry under them. */
export function showScored(bench: Bench, entry: Entry): Live<Extract<Entry, { type: 'statusTokens' }>> {
  return live(bench, entry as Extract<Entry, { type: 'statusTokens' }>, ({ pack, view, entry: shown, warnings, update }) => (
    <>
      <ScoredBlock entry={shown as Extract<Entry, { type: 'statusTokens' }>} pack={pack} view={view} onChange={patch => update(patch as Partial<EntryBody>)} />
      <WarningList warnings={warnings} table={view.table} board={view.board} pack={pack} />
    </>
  ));
}

/** Every warning of an entry as a list, as any block shows its own. */
export function showWarnings(bench: Bench, entry: Entry): Live {
  return live(bench, entry, ({ view, pack, warnings }) => <WarningList warnings={warnings} table={view.table} board={view.board} pack={pack} />);
}

/** The button that takes one unit or structure from a place: `take('Mech')`, in a row `take('PDS', 'Home One')`. */
export const takeButton = (unit: string, row?: string): HTMLElement =>
  (row ? within(screen.getByRole('group', { name: row })) : screen).getByRole('button', { name: `Take one ${unit}` });
export const take = (unit: string, row?: string): Promise<void> => userEvent.click(takeButton(unit, row));
export const putBack = (unit: string): Promise<void> => userEvent.click(screen.getByRole('button', { name: `Return one ${unit}` }));
/** Lands one unit or puts one structure on a planet, in the landing of the tactical editor. */
export const land = (unit: string, planet: string): Promise<void> =>
  userEvent.click(within(screen.getByRole('group', { name: `Landing on ${planet}` })).getByRole('button', { name: `Land one ${unit}` }));

/** Chooses the component the action plays: opens the choice, finds it by its name, takes it. */
export async function play(name: string): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Choose the component' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), name);
  await userEvent.click(await screen.findByRole('button', { name: `Choose ${name}` }));
}

/**
 * Answers a choice the played component asks (a planet, a player, a system, a unit, an option, a component) by the name
 * on its button; `choose('Home One', 'Planet')` within the row named so, when a name stands in two rows. Pressing the chosen one takes it back.
 */
export const choose = (name: string | RegExp, row?: string): Promise<void> =>
  userEvent.click((row ? within(screen.getByRole('group', { name: row })) : screen).getByRole('button', { name }));

/** Chooses a component in «Used»: opens the choice, finds it by its name, takes it. */
export async function use(name: string): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: '+ Used' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), name);
  await userEvent.click(await screen.findByRole('button', { name: `Choose ${name}` }));
}

/** The warnings of a code on the screen, as list items. */
export const shown = (code: AnyWarningCode): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(`li[data-code="${code}"]`)];

/** The warning is on the screen in the look of an allowed one, and names the component that allows it. */
export function expectShownWaived(code: AnyWarningCode, by: string): void {
  const items = shown(code);
  expect(items.length, `a ${code} warning is on the screen`).toBeGreaterThan(0);
  for (const item of items) {
    expect(item.className, `${code} is shown as allowed`).toContain('warning-waived');
    expect(item.textContent, `${code} names what allows it`).toContain(`Allowed by: ${by}`);
  }
}

/** The warning is on the screen and stands: nothing allows it. */
export function expectShownStanding(code: AnyWarningCode): void {
  const items = shown(code);
  expect(items.length, `a ${code} warning is on the screen`).toBeGreaterThan(0);
  for (const item of items) expect(item.className, `${code} stands`).not.toContain('warning-waived');
}

/** No warning of the code is on the screen. */
export function expectNotShown(code: AnyWarningCode): void {
  expect(shown(code)).toEqual([]);
}

/** Answers a long choice of components (a technology among all): opens the slot of that name, finds the component by its name, takes it. */
export async function chooseFromSlot(slot: string, name: string): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: slot }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), name);
  await userEvent.click(await screen.findByRole('button', { name: `Choose ${name}` }));
}
