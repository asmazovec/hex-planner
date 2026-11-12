/**
 * The bench for the tests of one component: the small known board of the rules tests (src/domain/rules/kit.ts) with the
 * real data of the expansions and a real faction seated on it, so that its sheet, its ships and its cards are those of
 * the game while every number of the board is set by the test.
 *
 *   0,0 home (h1 3/1, h2 1/2)   1,0 empty   2,0 target (t1 2/1, t2 1/3)   3,0 empty   4,0 empty
 *
 * A test file is `<kind>/<slug>.test.ts` beside the component's file; see docs/phase4/component-effects.md for its template.
 */
import { expect } from 'vitest';
import { componentById } from '../../components';
import { isWaived } from '../../rules/registry';
import { forecast, planned, rulesGame, rulesPack } from '../../rules/kit';
import type { AnyWarningCode, DataPack, Entry, EntryBody, ExpansionId, Game, GameState, StartHoldings, UnitCounts, Warning } from '../../types';
import { effectOf } from '../registry';
import type { ComponentEffect } from '../types';

export { FAR, FARTHER, HOME, NEAR, NO_PAYMENT, TARGET, adjust, before, planned, primary, secondary, statusTokens, tactical } from '../../rules/kit';

export interface Bench { pack: DataPack; game: Game }

export interface BenchOptions {
  /** The faction I play: a real one of the pack, seated at the test home with no starting units. */
  faction: string;
  /** The expansions the component needs; the base game is always on. */
  expansions?: ExpansionId[];
  /** My units in the space areas, by slot. */
  units?: Record<string, UnitCounts>;
  /** What I hold when the plan begins: technologies, hand, relics, notes, leaders, breakthrough. */
  start?: StartHoldings;
  /** The entries of round 1, or every round's with `rounds`. */
  entries?: Entry[];
  rounds?: Entry[][];
  /** Anything else of the game: `docks`, `pds`, `planetControl`, opponents. */
  game?: Partial<Game>;
  /** A last change of the pack. */
  edit?: (pack: DataPack) => void;
}

/** A game of the faction on the test board. */
export function bench(options: BenchOptions): Bench {
  const expansions = options.expansions ?? [];
  const pack = rulesPack(data => {
    const real = data.factions[options.faction];
    if (!real) throw new Error(`no faction ${options.faction} with expansions [${expansions.join(', ')}]`);
    data.factions[options.faction] = { ...real, homeTile: 'r-home', startUnits: {}, startingTech: [] };
    options.edit?.(data);
  }, expansions);
  const game = rulesGame({
    units: options.units, entries: options.entries, rounds: options.rounds, expansions,
    game: { faction: options.faction, start: { me: options.start ?? {}, opponents: {} }, ...options.game },
  });
  return { pack, game };
}

/** A component action that plays `componentId`. */
export const componentAction = (componentId: string, extra: Partial<Entry> = {}): Entry =>
  planned({ type: 'component', componentId, note: '' } as EntryBody, 'action', extra);

/** The same entry, naming the components it uses beside its action. */
export const using = (entry: Entry, ...ids: string[]): Entry => ({ ...entry, uses: [...(entry.uses ?? []), ...ids] });

/** The warnings of one entry in the forecast, waived ones among them. */
export const warningsOf = ({ game, pack }: Bench, entry: Entry): Warning[] => forecast(game, pack).warnings[entry.id] ?? [];

/** The board at the end of the plan. */
export const endOf = ({ game, pack }: Bench): GameState => forecast(game, pack).state;

const ofCode = (warnings: Warning[], code: AnyWarningCode): Warning[] => warnings.filter(w => w.code === code);

/** The check is still made, and `by` lifts every warning of it: listed, marked, none standing. */
export function expectWaived(warnings: Warning[], code: AnyWarningCode, by: string): void {
  const found = ofCode(warnings, code);
  expect(found.length, `a ${code} warning is still listed`).toBeGreaterThan(0);
  for (const warning of found) expect(warning.waivedBy ?? [], `${code} waived by ${by}`).toContain(by);
}

/** The check is made and nothing lifts it. */
export function expectStanding(warnings: Warning[], code: AnyWarningCode): void {
  const found = ofCode(warnings, code);
  expect(found.length, `a ${code} warning is listed`).toBeGreaterThan(0);
  expect(found.filter(isWaived), `${code} stands`).toEqual([]);
}

/** The check finds nothing: the component changed the number itself, or nothing was breached. */
export function expectNone(warnings: Warning[], code: AnyWarningCode): void {
  expect(ofCode(warnings, code)).toEqual([]);
}

/**
 * A fragment of the component's printed text, checked against the pack so that a quote in a test cannot rot: the
 * English text as the source has it, whatever language the pack was loaded in. Returns the fragment.
 */
export function quote(pack: DataPack, id: string, fragment: string): string {
  expect(componentById(pack, id), `${id} is in the catalogue`).toBeDefined();
  const printed = pack.originalTexts?.[id] ?? pack.texts[id] ?? '';
  expect(printed.replace(/\s+/g, ' '), `the printed text of ${id}`).toContain(fragment);
  return fragment;
}

/** The effect of a component, which the test then reads: its tier, its steps, its waivers. */
export function effect(pack: DataPack, id: string): ComponentEffect {
  const found = effectOf(pack, id);
  expect(found, `${id} has an effect`).toBeDefined();
  return found!;
}
