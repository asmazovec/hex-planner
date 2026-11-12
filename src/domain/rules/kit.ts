/**
 * A small, fully known board for the rules tests: every number a test relies on is set here, so a test reads as the
 * rule it fixes and not as the data pack. Unit statistics come from the base pack (a public source), the board does not.
 *
 * The board is a row running south-east: each slot is the neighbour of the one before across edge 2.
 *
 *   0,0 home (h1 3/1, h2 1/2)   1,0 empty   2,0 target (t1 2/1, t2 1/3)   3,0 empty   4,0 empty
 */
import { loadPack } from '../../data/loadPack';
import { upgradeTech } from '../holdings';
import { project, stateBeforeEntry } from '../project';
import { SAVE_FORMAT, type ExpansionId, type CardEffects, type CardPlay, type DataPack, type Entry, type EntryBody, type Game, type GameState, type Phase, type TileDef, type UnitCounts, type UpgradeId, type Warning } from '../types';

export const HOME = '0,0';
export const NEAR = '1,0';
export const TARGET = '2,0';
export const FAR = '3,0';
export const FARTHER = '4,0';
export const ROW = [HOME, NEAR, TARGET, FAR, FARTHER];

const system = (id: string, extra: Partial<TileDef> = {}): TileDef =>
  ({ id, number: id, planetIds: [], kind: 'system', wormholes: [], ...extra });

const TILES: Record<string, TileDef> = {
  'r-home': system('r-home', { kind: 'home', planetIds: ['h1', 'h2'] }),
  'r-empty': system('r-empty'),
  'r-target': system('r-target', { planetIds: ['t1', 't2'] }),
  'r-alpha': system('r-alpha', { wormholes: ['alpha'] }),
  'r-beta': system('r-beta', { wormholes: ['beta'] }),
  'r-nebula': system('r-nebula', { anomaly: 'nebula' }),
  'r-asteroid': system('r-asteroid', { anomaly: 'asteroid' }),
  'r-supernova': system('r-supernova', { anomaly: 'supernova' }),
  'r-rift': system('r-rift', { anomaly: 'rift' }),
  'r-lane': { id: 'r-lane', number: 'r-lane', planetIds: [], kind: 'hyperlane', wormholes: [], lanes: [[2, 5]] },
};

const PLANETS = {
  h1: { id: 'h1', name: 'Home One', resources: 3, influence: 1 },
  h2: { id: 'h2', name: 'Home Two', resources: 1, influence: 2 },
  t1: { id: 't1', name: 'Target One', resources: 2, influence: 1 },
  t2: { id: 't2', name: 'Target Two', resources: 1, influence: 3 },
};

export const FACTION = 'rules-tester';

/** The common technology that upgrades a unit or structure, as a component id: `tech('carrier')` is Carrier II. */
export const tech = (kind: UpgradeId): string => upgradeTech(loadPack([]), FACTION, kind) ?? `technology:${kind}`;

/** The base pack (or the pack of `expansions`) with the test board and a faction whose home is `r-home` and who starts with no units. */
export function rulesPack(edit?: (pack: DataPack) => void, expansions: ExpansionId[] = []): DataPack {
  const base = loadPack(expansions);
  const pack: DataPack = {
    ...base,
    tiles: { ...base.tiles, ...TILES },
    planets: { ...base.planets, ...PLANETS },
    units: structuredClone(base.units),
    factions: {
      ...base.factions,
      [FACTION]: { id: FACTION, name: 'Rules Tester', homeTile: 'r-home', startUnits: {}, startingTech: [], commodities: 3, abilities: [] },
    },
  };
  edit?.(pack);
  return pack;
}

const DEFAULT_MAP: Record<string, string> = {
  [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty',
};

/** A six-player game on the test row, with no opponents unless the test adds them. Starting units go in by `units`. */
export function rulesGame(options: {
  map?: Record<string, string>; units?: Record<string, UnitCounts>; entries?: Entry[]; rounds?: Entry[][];
  playerCount?: number; game?: Partial<Game>; expansions?: ExpansionId[];
} = {}): Game {
  const rounds = options.rounds ?? [options.entries ?? []];
  const start: Entry[] = Object.entries(options.units ?? {}).map(([systemId, units], i) => ({
    id: `setup-${i}`, phase: 'strategy', status: 'done', type: 'adjustment', label: 'setup', kind: 'setup',
    delta: { units: { systemId, units } },
  }));
  return {
    id: 'rules', format: SAVE_FORMAT, schemaVersion: 1, dataVersion: 'rules', expansions: options.expansions ?? [], playerCount: options.playerCount ?? 6, layout: 'standard',
    faction: FACTION, seat: 1, color: 1, vp: 0,
    map: { ...(options.map ?? DEFAULT_MAP) },
    opponents: [], start: { me: {}, opponents: {} }, enemyUnits: {}, enemyGround: {}, planetControl: {}, planetOwner: {},
    docks: [], pds: {}, expedition: { slices: {}, thundersEdgeSystem: null }, fracture: { active: false, ingress: [], seat: null, tiles: {} },
    plans: [{ id: 'plan', name: 'plan', rounds: rounds.map((entries, i) => ({
      number: i + 1, strategyCard: null, backupCard: null, entries: i === 0 ? [...start, ...entries] : entries,
    })) }],
    activePlanId: 'plan',
    ...options.game,
  };
}

let next = 0;
const entry = (body: EntryBody, phase: Phase = 'action', extra: Partial<Entry> = {}): Entry =>
  ({ id: `e${(next += 1)}`, phase, status: 'planned', ...body, ...extra } as Entry);

/** A planned entry of any body, with an id of its own. */
export const planned = entry;

export const NO_PAYMENT = { planets: [], tradeGoods: 0 };

export function tactical(systemId: string, body: Partial<Extract<EntryBody, { type: 'tactical' }>> = {}, extra: Partial<Entry> = {}): Entry {
  return entry({ type: 'tactical', systemId, moves: [], landings: [], production: {}, payment: NO_PAYMENT, ...body }, 'action', extra);
}

export function primary(card: number, effects: CardEffects = {}, play: CardPlay = {}): Entry {
  return entry({ type: 'strategic', card, effects, ...play });
}

export function secondary(card: number, effects: CardEffects = {}, play: CardPlay = {}): Entry {
  return entry({ type: 'secondary', card, effects, ...play });
}

export function statusTokens(tactic: number, fleet: number, strategy: number): Entry {
  return entry({ type: 'statusTokens', tactic, fleet, strategy }, 'status');
}

export function adjust(delta: Extract<EntryBody, { type: 'adjustment' }>['delta'], phase: Phase = 'action'): Entry {
  return entry({ type: 'adjustment', label: 'test', delta }, phase);
}

/** The forecast of the active plan: every planned entry counts. */
export function forecast(game: Game, pack: DataPack): { state: GameState; warnings: Record<string, Warning[]> } {
  const { state, warningsByEntry } = project(game, game.plans[0], 'forecast', pack);
  return { state, warnings: warningsByEntry };
}

/** The warning codes of one entry, as plain strings: a rule may name a code the app does not have yet. */
export function codesOf(game: Game, pack: DataPack, target: Entry): string[] {
  return (forecast(game, pack).warnings[target.id] ?? []).map(w => w.code as string);
}

export const before = (game: Game, pack: DataPack, target: Entry): GameState => stateBeforeEntry(game, game.plans[0], target.id, pack);

/** The main LRR rule of each warning of one entry, from the rule registry. */
export function rulesOf(game: Game, pack: DataPack, target: Entry): string[] {
  return (forecast(game, pack).warnings[target.id] ?? []).flatMap(w => w.rule ?? []);
}
