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
import { project, stateBeforeEntry } from '../../domain/project';
import type { AnyWarningCode, DataPack, Entry, EntryBody, Game, GameState, Warning } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { WarningList } from '../feedback/WarningText';
import { UsesBlock } from '../plan/blocks/UsesBlock';
import { TacticalEditor } from '../plan/editors/TacticalEditor';
import { flightWarnings, UnitPicker } from '../plan/editors/UnitPicker';

type TacticalEntry = Extract<Entry, { type: 'tactical' }>;

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

interface Seen { game: Game; pack: DataPack; entry: Entry; before: GameState; warnings: Warning[]; update: (patch: Partial<EntryBody>) => void }

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
    return <>{view({ game, pack: bench.pack, entry: shown, before, warnings, update })}</>;
  }
  // The choice of a component reads the game from the store.
  useGame.setState({ game: bench.game });
  render(<Host />);
  return { entry: () => entryOf(current, entry.id) as E, warnings: warningsNow, game: () => current };
}

/** The flight step of one source of a tactical action (`UnitPicker`): who flies, what rides on board, with the warnings of that flight. */
export function showFlight(bench: Bench, entry: Entry, source: string): Live<TacticalEntry> {
  return live(bench, entry as TacticalEntry, ({ game, pack, entry: shown, before, warnings, update }) => (
    <UnitPicker
      game={game} pack={pack} before={before} entry={shown as TacticalEntry} source={source}
      warnings={flightWarnings(warnings, game, pack, shown as TacticalEntry, source)}
      onChange={moves => update({ moves } as Partial<EntryBody>)} onClose={() => undefined} onFly={() => undefined}
    />
  ));
}

/** The whole tactical editor of an entry, with «Used» as its common part: the landing, the result of the action, every block's warnings. */
export function showTactical(bench: Bench, entry: Entry): Live<TacticalEntry> {
  const nothing = () => undefined;
  return live(bench, entry as TacticalEntry, ({ game, pack, entry: shown, before, warnings, update }) => (
    <TacticalEditor
      game={game} pack={pack} entry={shown as TacticalEntry} before={before} warnings={warnings} manualPayment={false} choosing={null}
      onChoose={nothing} onUpdate={patch => update(patch as Partial<EntryBody>)} onOpenPicker={nothing} onManualPayment={nothing}
      onOpenShop={nothing} onOpenBattle={nothing} onOpenFleet={nothing} onDone={nothing} onRemove={nothing}
      common={<UsesBlock entry={shown} game={game} pack={pack} before={before} onChange={patch => update(patch as Partial<EntryBody>)} />}
    />
  ));
}

/** «Used» of any entry with every warning of the entry under it: what a component named there allows is seen at once. */
export function showUses(bench: Bench, entry: Entry): Live {
  return live(bench, entry, ({ game, pack, entry: shown, before, warnings, update }) => (
    <>
      <UsesBlock entry={shown} game={game} pack={pack} before={before} onChange={patch => update(patch as Partial<EntryBody>)} />
      <WarningList warnings={warnings} game={game} pack={pack} />
    </>
  ));
}

/** Every warning of an entry as a list, as any block shows its own. */
export function showWarnings(bench: Bench, entry: Entry): Live {
  return live(bench, entry, ({ game, pack, warnings }) => <WarningList warnings={warnings} game={game} pack={pack} />);
}

/** The button that takes one unit or structure from a place: `take('Mech')`, in a row `take('PDS', 'Home One')`. */
export const takeButton = (unit: string, row?: string): HTMLElement =>
  (row ? within(screen.getByRole('group', { name: row })) : screen).getByRole('button', { name: `Take one ${unit}` });
export const take = (unit: string, row?: string): Promise<void> => userEvent.click(takeButton(unit, row));
export const putBack = (unit: string): Promise<void> => userEvent.click(screen.getByRole('button', { name: `Return one ${unit}` }));
/** Lands one unit or puts one structure on a planet, in the landing of the tactical editor. */
export const land = (unit: string, planet: string): Promise<void> =>
  userEvent.click(within(screen.getByRole('group', { name: `Landing on ${planet}` })).getByRole('button', { name: `Land one ${unit}` }));

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
