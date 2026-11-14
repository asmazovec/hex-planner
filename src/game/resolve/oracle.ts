/**
 * The frozen oracle of the kernel: for the whole corpus of games the tests build, for every plan and filter, each entry gets the
 * hash of the board after it (read through the old model, every player) and of its warnings. The fixture is
 * `__oracle__/corpus.json.gz`, written by `ORACLE_RECORD=1 npx vitest run src/game/resolve/record.test.ts` from the kernel itself
 * (the old replay is gone; the first recording was checked against it). Flag `1` marks an entry on which the old replay agreed.
 */
import { createHash } from 'node:crypto';
import { loadPack } from '../../data/loadPack';
import { legacyState, boardOf, tableOf } from '../../testing/old/game/fromLegacy';
import { normalWarnings } from '../compare';
import { normalState } from '../../testing/old/game/compare';
import { planOf } from '../../testing/old/game/fromLegacy';
import { timeline as kernelTimeline, type Filter } from '../timeline';
import type { DataPack, ExpansionId, Game, Plan } from '../../domain/types';

export const hash = (value: unknown): string =>
  createHash('sha1').update(JSON.stringify(value, (_, v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v))).digest('base64').slice(0, 9);

/** [entry id, state hash, warnings hash, whether the old replay agreed]. */
export type Mark = [string, string, string, 0 | 1];
export interface Run { plan: string; filter: Filter; marks: Mark[] }
export interface Case { expansions: ExpansionId[]; /** The expansions the pack was loaded with: a test's pack may differ from its game's. */ packExpansions: ExpansionId[]; packDelta: Record<string, Record<string, unknown>>; game: Game; runs: Run[] }

/** What a pack holds beyond (or other than) the real pack of its expansions: the tables a test adds to. */
const CANDIDATES: ExpansionId[][] = [[], ['pok'], ['pok', 'te'], ['te']];
export function packBaseOf(pack: DataPack): { packExpansions: ExpansionId[]; packDelta: Case['packDelta'] } {
  let best: { packExpansions: ExpansionId[]; packDelta: Case['packDelta'] } | undefined;
  for (const packExpansions of CANDIDATES) {
    const packDelta = packDeltaOf(pack, packExpansions);
    if (!best || JSON.stringify(packDelta).length < JSON.stringify(best.packDelta).length) best = { packExpansions, packDelta };
  }
  return best!;
}

export function packDeltaOf(pack: DataPack, expansions: ExpansionId[]): Case['packDelta'] {
  const base = loadPack(expansions) as unknown as Record<string, unknown>;
  const delta: Case['packDelta'] = {};
  for (const [section, table] of Object.entries(pack as unknown as Record<string, unknown>)) {
    if (!table || typeof table !== 'object' || table === base[section]) continue;
    if (Array.isArray(table)) { if (JSON.stringify(table) !== JSON.stringify(base[section])) (delta[section] ??= {})['*'] = table; continue; }
    const baseTable = (base[section] ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(table as Record<string, unknown>)) {
      if (baseTable[key] === value || JSON.stringify(baseTable[key]) === JSON.stringify(value)) continue;
      (delta[section] ??= {})[key] = value;
    }
  }
  return delta;
}

export function packOf(item: Pick<Case, 'packExpansions' | 'packDelta'>): DataPack {
  const base = loadPack(item.packExpansions) as unknown as Record<string, unknown>;
  const pack = { ...base };
  for (const [section, entries] of Object.entries(item.packDelta)) pack[section] = '*' in entries ? entries['*'] : { ...(base[section] as object), ...entries };
  return pack as unknown as DataPack;
}

/** The kernel's timeline of a plan, as marks. `agree` says, per entry id, whether the old frame matched (only when recording). */
export function marksOf(game: Game, pack: DataPack, plan: Plan, filter: Filter, agree?: (entryId: string, state: unknown, warnings: string[]) => boolean): Mark[] {
  const table = tableOf(game);
  const line = kernelTimeline(table, pack, planOf(table, plan, pack), filter, { start: boardOf(game, pack) });
  const marks: Mark[] = [];
  for (const [entryId, frame] of line.byTurn) {
    if (!frame.applied) continue;
    const state = normalState(legacyState(table, frame.after, pack, table.viewer));
    const warnings = normalWarnings(frame.violations);
    marks.push([entryId, hash(state), hash(warnings), agree ? (agree(entryId, state, warnings) ? 1 : 0) : 1]);
  }
  return marks;
}

/** The fixture on disk: games and pack deltas each stored once, cases pointing at them. */
export interface Fixture { packs: Record<string, Case['packDelta']>; cases: { expansions: ExpansionId[]; packExpansions: ExpansionId[]; pack: string; game: Game; runs: Run[] }[] }

export function fixtureOf(items: Case[]): Fixture {
  const packs: Fixture['packs'] = {};
  const cases = new Map<string, Fixture['cases'][number]>();
  for (const item of items) {
    const pack = hash(item.packDelta);
    packs[pack] = item.packDelta;
    const key = `${item.packExpansions.join(',')}/${pack}/${hash(item.game)}/${item.expansions.join(',')}/${hash(item.runs)}`;
    if (!cases.has(key)) cases.set(key, { expansions: item.expansions, packExpansions: item.packExpansions, pack, game: item.game, runs: item.runs });
  }
  return { packs, cases: [...cases.values()] };
}
