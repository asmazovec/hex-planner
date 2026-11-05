import { create } from 'zustand';
import { createGame } from '../domain/newGame';
import type {
  DataPack, Entry, EntryBody, EntryStatus, ExpansionId, Game, Phase, Plan, Round, UnitCounts,
} from '../domain/types';
import { loadGame, saveGame } from '../storage/db';

const HISTORY_LIMIT = 50;

const newId = (): string => globalThis.crypto.randomUUID();
const defaultPlanName = (position: number): string => `Plan ${position}`;

function editPlan(game: Game, edit: (plan: Plan) => Plan): Game {
  return { ...game, plans: game.plans.map(p => (p.id === game.activePlanId ? edit(p) : p)) };
}

/** Rewrites one round of the active plan. */
function editRound(game: Game, roundNo: number, edit: (round: Round) => Round): Game {
  return editPlan(game, plan => ({ ...plan, rounds: plan.rounds.map(r => (r.number === roundNo ? edit(r) : r)) }));
}

/** Rewrites the round of the active plan that holds the entry; other rounds stay as they were. */
function editEntryRound(game: Game, entryId: string, edit: (round: Round) => Round): Game {
  return editPlan(game, plan => ({
    ...plan, rounds: plan.rounds.map(r => (r.entries.some(e => e.id === entryId) ? edit(r) : r)),
  }));
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
  return [...rest.slice(0, insertAt), { ...moving, phase }, ...rest.slice(insertAt)];
}

function cycleCard(round: Round, initiative: number): Round {
  if (round.strategyCard === initiative) return { ...round, strategyCard: null, backupCard: initiative };
  if (round.backupCard === initiative) return { ...round, backupCard: null };
  return { ...round, strategyCard: initiative };
}

function setOrDelete<T>(record: Record<string, T>, key: string, value: T | null): Record<string, T> {
  const rest = { ...record };
  delete rest[key];
  return value === null ? rest : { ...rest, [key]: value };
}

const hasUnits = (units: UnitCounts): boolean => Object.values(units).some(n => (n ?? 0) > 0);

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
      commit(g => editEntryRound(g, id, r => ({
        ...r, entries: r.entries.map(e => (e.id === id ? ({ ...e, ...patch } as Entry) : e)),
      }))),
    moveEntry: (id, toPhase, toIndex) =>
      commit(g => editEntryRound(g, id, r => ({ ...r, entries: placeEntry(r.entries, id, toPhase, toIndex) }))),
    removeEntry: id =>
      commit(g => editEntryRound(g, id, r => ({ ...r, entries: r.entries.filter(e => e.id !== id) }))),
    setEntryStatus: (id, status) =>
      commit(g => editEntryRound(g, id, r => ({
        ...r, entries: r.entries.map(e => (e.id === id ? { ...e, status } : e)),
      }))),
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
      commit(g => editPlan(g, plan => ({
        ...plan, name: name.trim() || defaultPlanName(g.plans.findIndex(p => p.id === plan.id) + 1),
      }))),
    deletePlan: id =>
      commit(g => {
        if (g.plans.length <= 1 || !g.plans.some(p => p.id === id)) return g;
        const plansLeft = g.plans.filter(p => p.id !== id);
        return { ...g, plans: plansLeft, activePlanId: g.activePlanId === id ? plansLeft[0].id : g.activePlanId };
      }),
    setActivePlan: id =>
      commit(g => (g.activePlanId === id || !g.plans.some(p => p.id === id) ? g : { ...g, activePlanId: id })),

    setTile: (slotKey, tileId) => commit(g => ({ ...g, map: setOrDelete(g.map, slotKey, tileId) })),
    setOpponent: (index, patch) =>
      commit(g => (index in g.opponents
        ? { ...g, opponents: g.opponents.map((o, i) => (i === index ? { ...o, ...patch } : o)) }
        : g)),
    setEnemyUnits: (systemId, units) =>
      commit(g => ({ ...g, enemyUnits: setOrDelete(g.enemyUnits, systemId, hasUnits(units) ? units : null) })),
    setPlanetControl: (planetId, owner) =>
      commit(g => ({ ...g, planetControl: setOrDelete(g.planetControl, planetId, owner) })),
    setSlice: (id, owner) =>
      commit(g => ({ ...g, expedition: { ...g.expedition, slices: setOrDelete(g.expedition.slices, id, owner) } })),
    setThundersEdge: systemId => commit(g => ({ ...g, expedition: { ...g.expedition, thundersEdgeSystem: systemId } })),
    setFractureActive: active => commit(g => ({ ...g, fracture: { ...g.fracture, active } })),
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
