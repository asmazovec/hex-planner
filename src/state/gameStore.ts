import { create } from 'zustand';
import { createGame } from '../domain/newGame';
import type {
  DataPack, Entry, EntryBody, EntryStatus, ExpansionId, Game, Phase, Plan, Round, UnitCounts,
} from '../domain/types';
import { loadGame, saveGame } from '../storage/db';

const HISTORY_LIMIT = 50;

const newId = (): string => globalThis.crypto.randomUUID();
const defaultPlanName = (position: number): string => `Plan ${position}`;

/** Maps a list but keeps the original array when no item changed, so no-op edits stay detectable by reference. */
function mapSame<T>(items: T[], edit: (item: T) => T): T[] {
  const next = items.map(edit);
  return next.every((item, i) => item === items[i]) ? items : next;
}

function editPlan(game: Game, edit: (plan: Plan) => Plan): Game {
  const plans = mapSame(game.plans, p => (p.id === game.activePlanId ? edit(p) : p));
  return plans === game.plans ? game : { ...game, plans };
}

function editRounds(plan: Plan, pick: (round: Round) => boolean, edit: (round: Round) => Round): Plan {
  const rounds = mapSame(plan.rounds, r => (pick(r) ? edit(r) : r));
  return rounds === plan.rounds ? plan : { ...plan, rounds };
}

/** Rewrites one round of the active plan. */
function editRound(game: Game, roundNo: number, edit: (round: Round) => Round): Game {
  return editPlan(game, plan => editRounds(plan, r => r.number === roundNo, edit));
}

/** Rewrites the round of the active plan that holds the entry; other rounds stay as they were. */
function editEntryRound(game: Game, entryId: string, edit: (round: Round) => Round): Game {
  return editPlan(game, plan => editRounds(plan, r => r.entries.some(e => e.id === entryId), edit));
}

/** Rewrites a round's entries, keeping the round itself when none changed. */
function editEntries(round: Round, edit: (entries: Entry[]) => Entry[]): Round {
  const entries = edit(round.entries);
  return entries === round.entries ? round : { ...round, entries };
}

const mapEntry = (entries: Entry[], id: string, edit: (entry: Entry) => Entry): Entry[] =>
  mapSame(entries, e => (e.id === id ? edit(e) : e));

function withField<K extends keyof Game>(game: Game, key: K, value: Game[K]): Game {
  return game[key] === value ? game : { ...game, [key]: value };
}

/** Entries of one phase keep their relative order; `toIndex` counts within that phase. */
function placeEntry(entries: Entry[], id: string, phase: Phase, toIndex: number): Entry[] {
  const moving = entries.find(e => e.id === id);
  if (!moving) return entries;
  const rest = entries.filter(e => e.id !== id);
  const samePhase = rest.filter(e => e.phase === phase);
  const index = Math.max(0, Math.min(toIndex, samePhase.length));
  const before = samePhase[index];
  const insertAt = before ? rest.indexOf(before) : rest.length;
  const next = [...rest.slice(0, insertAt), moving.phase === phase ? moving : { ...moving, phase }, ...rest.slice(insertAt)];
  return next.every((e, i) => e === entries[i]) ? entries : next;
}

function cycleCard(round: Round, initiative: number): Round {
  if (round.strategyCard === initiative) return { ...round, strategyCard: null, backupCard: initiative };
  if (round.backupCard === initiative) return { ...round, backupCard: null };
  return { ...round, strategyCard: initiative };
}

function setOrDelete<T>(record: Record<string, T>, key: string, value: T | null): Record<string, T> {
  if (value === null && !(key in record)) return record;
  if (value !== null && record[key] === value) return record;
  const rest = { ...record };
  delete rest[key];
  return value === null ? rest : { ...rest, [key]: value };
}

/** Counts compare equal when every unit has the same positive count, ignoring zeros. */
function sameUnits(a: UnitCounts, b: UnitCounts): boolean {
  const ids = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof UnitCounts>;
  return [...ids].every(id => (a[id] ?? 0) === (b[id] ?? 0));
}

const hasUnits =(units: UnitCounts): boolean => Object.values(units).some(n => (n ?? 0) > 0);

function copyOf(game: Game): Game {
  const source = game.plans.find(p => p.id === game.activePlanId);
  if (!source) return game;
  const copy: Plan = {
    id: newId(),
    name: defaultPlanName(game.plans.length + 1),
    rounds: structuredClone(source.rounds).map(r => ({ ...r, entries: r.entries.map(e => ({ ...e, id: newId() })) })),
  };
  return { ...game, plans: [...game.plans, copy], activePlanId: copy.id };
}

export interface GameStore {
  game: Game | null;
  saveError: string | null;
  canUndo: boolean;
  newGame(input: { expansions: ExpansionId[]; playerCount: number; faction: string }, pack: DataPack): void;
  /** Loads a saved game by id; an unknown id leaves the current game alone. */
  openGame(id: string): Promise<void>;
  addEntry(roundNo: number, body: EntryBody, phase: Phase): string;
  updateEntry(id: string, patch: Partial<EntryBody>): void;
  moveEntry(id: string, toPhase: Phase, toIndex: number): void;
  removeEntry(id: string): void;
  setEntryStatus(id: string, status: EntryStatus): void;
  /** Primary, then backup, then removed. */
  setStrategyCard(roundNo: number, initiative: number): void;
  addRound(): void;
  copyPlan(): void;
  renamePlan(name: string): void;
  deletePlan(id: string): void;
  setActivePlan(id: string): void;
  setTile(slotKey: string, tileId: string | null): void;
  setOpponent(index: number, patch: Partial<Game['opponents'][number]>): void;
  setEnemyUnits(systemId: string, units: UnitCounts): void;
  setPlanetControl(planetId: string, owner: 'me' | 'enemy' | null): void;
  setSlice(id: string, owner: 'me' | 'other' | null): void;
  setThundersEdge(systemId: string | null): void;
  setFractureActive(active: boolean): void;
  toggleIngress(systemId: string): void;
  undo(): void;
}

let history: Game[] = [];
/** Writes run one after another so an older state can never overwrite a newer one. */
let pendingSave: Promise<void> = Promise.resolve();

export const useGame = create<GameStore>((set, get) => {
  const autosave = (game: Game): void => {
    pendingSave = pendingSave.then(async () => {
      try {
        await saveGame(game);
        set({ saveError: null });
      } catch (error) {
        set({ saveError: error instanceof Error ? error.message : String(error) });
      }
    });
  };

  const replace = (game: Game): void => {
    set({ game, canUndo: history.length > 0 });
    autosave(game);
  };

  /** Applies an edit to the current game; an edit that changes nothing leaves no undo step and no save. */
  const commit = (edit: (game: Game) => Game): void => {
    const current = get().game;
    if (!current) return;
    const next = edit(current);
    if (next === current) return;
    history = [...history.slice(-(HISTORY_LIMIT - 1)), current];
    replace(next);
  };

  return {
    game: null,
    saveError: null,
    canUndo: false,

    newGame: (input, pack) => {
      history = [];
      replace(createGame(input, pack));
    },
    openGame: async id => {
      const loaded = await loadGame(id);
      if (!loaded) return;
      history = [];
      set({ game: loaded, canUndo: false, saveError: null });
    },

    addEntry: (roundNo, body, phase) => {
      const id = newId();
      const entry = { ...body, id, phase, status: 'planned' } as Entry;
      commit(g => editRound(g, roundNo, r => ({ ...r, entries: [...r.entries, entry] })));
      return id;
    },
    updateEntry: (id, patch) =>
      commit(g => editEntryRound(g, id, r => editEntries(r, es =>
        mapEntry(es, id, e => (Object.entries(patch).every(([k, v]) => (e as Record<string, unknown>)[k] === v)
          ? e : ({ ...e, ...patch } as Entry)))))),
    moveEntry: (id, toPhase, toIndex) =>
      commit(g => editEntryRound(g, id, r => editEntries(r, es => placeEntry(es, id, toPhase, toIndex)))),
    removeEntry: id =>
      commit(g => editEntryRound(g, id, r => editEntries(r, es => es.filter(e => e.id !== id)))),
    setEntryStatus: (id, status) =>
      commit(g => editEntryRound(g, id, r => editEntries(r, es =>
        mapEntry(es, id, e => (e.status === status ? e : { ...e, status }))))),
    setStrategyCard: (roundNo, initiative) => commit(g => editRound(g, roundNo, r => cycleCard(r, initiative))),
    addRound: () =>
      commit(g => editPlan(g, plan => ({
        ...plan,
        rounds: [...plan.rounds, {
          number: Math.max(0, ...plan.rounds.map(r => r.number)) + 1, strategyCard: null, backupCard: null, entries: [],
        }],
      }))),

    copyPlan: () => commit(copyOf),
    renamePlan: name =>
      commit(g => editPlan(g, plan => {
        const next = name.trim() || defaultPlanName(g.plans.findIndex(p => p.id === plan.id) + 1);
        return next === plan.name ? plan : { ...plan, name: next };
      })),
    deletePlan: id =>
      commit(g => {
        if (g.plans.length <= 1 || !g.plans.some(p => p.id === id)) return g;
        const plansLeft = g.plans.filter(p => p.id !== id);
        return { ...g, plans: plansLeft, activePlanId: g.activePlanId === id ? plansLeft[0].id : g.activePlanId };
      }),
    setActivePlan: id =>
      commit(g => (g.activePlanId === id || !g.plans.some(p => p.id === id) ? g : { ...g, activePlanId: id })),

    setTile: (slotKey, tileId) => commit(g => withField(g, 'map', setOrDelete(g.map, slotKey, tileId))),
    setOpponent: (index, patch) =>
      commit(g => (index in g.opponents
        && !Object.entries(patch).every(([k, v]) => g.opponents[index][k as keyof Game['opponents'][number]] === v)
        ? { ...g, opponents: g.opponents.map((o, i) => (i === index ? { ...o, ...patch } : o)) }
        : g)),
    setEnemyUnits: (systemId, units) =>
      commit(g => (sameUnits(g.enemyUnits[systemId] ?? {}, units)
        ? g
        : withField(g, 'enemyUnits', setOrDelete(g.enemyUnits, systemId, hasUnits(units) ? units : null)))),
    setPlanetControl: (planetId, owner) =>
      commit(g => withField(g, 'planetControl', setOrDelete(g.planetControl, planetId, owner))),
    setSlice: (id, owner) =>
      commit(g => {
        const slices = setOrDelete(g.expedition.slices, id, owner);
        return slices === g.expedition.slices ? g : { ...g, expedition: { ...g.expedition, slices } };
      }),
    setThundersEdge: systemId =>
      commit(g => (g.expedition.thundersEdgeSystem === systemId
        ? g : { ...g, expedition: { ...g.expedition, thundersEdgeSystem: systemId } })),
    setFractureActive: active =>
      commit(g => (g.fracture.active === active ? g : { ...g, fracture: { ...g.fracture, active } })),
    toggleIngress: systemId =>
      commit(g => ({
        ...g,
        fracture: {
          ...g.fracture,
          ingress: g.fracture.ingress.includes(systemId)
            ? g.fracture.ingress.filter(s => s !== systemId)
            : [...g.fracture.ingress, systemId],
        },
      })),

    undo: () => {
      const previous = history.at(-1);
      if (!previous) return;
      history = history.slice(0, -1);
      replace(previous);
    },
  };
});
