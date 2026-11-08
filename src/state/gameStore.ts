import { create } from 'zustand';
import { loadPack } from '../data/loadPack';
import { changeOnBoard, type MergedChange } from '../domain/losses';
import { changeLayout } from '../domain/mapBuilder';
import { createGame } from '../domain/newGame';
import { draftFromShare, readShareLink, shareDifferences, type ShareDifference, type ShareParams } from '../domain/shareLink';
import { withTeMecatol } from '../domain/mecatol';
import { startingDocks, withForTokenOfRound } from '../domain/strategy';
import { fractureSlots, withFractureMoved } from '../domain/thundersEdge';
import { toggleUpgrade } from '../domain/unitStats';
import { slotKeyOf } from '../domain/layouts';
import { placeStartUnits, addPlayer, draftWithExpansions, removePlayer, setPlayerFaction, swapSeats } from '../domain/players';
import type {
  DataPack, Entry, EntryBody, EntryStatus, ExpansionId, Game, MapLayout, Phase, Plan, Round, UnitCounts, UnitId,
} from '../domain/types';
import { loadGame, saveGame, listGames } from '../storage/db';
import { errorText } from '../storage/errorText';

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

/** The round's cards change; the replay derives what a primary costs from them (83.3), and my primaries' saved flags follow. */
function cycleCard(round: Round, initiative: number, playerCount: number): Round {
  const next = round.strategyCard === initiative ? { ...round, strategyCard: null }
    : round.backupCard === initiative ? { ...round, strategyCard: initiative, backupCard: null }
      : { ...round, backupCard: initiative };
  return withForTokenOfRound(next, playerCount);
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

/** New ids, with a free tactical still pointing at the copy of the card that started it. */
function copiedEntries(entries: Entry[]): Entry[] {
  const ids = new Map(entries.map(e => [e.id, newId()]));
  return entries.map(e => ({
    ...e, id: ids.get(e.id)!,
    ...(e.type === 'tactical' && e.fromCard ? { fromCard: ids.get(e.fromCard) } : {}),
  }));
}

/** The tiles of the open Fracture by slot. They follow its seat and the map's size. */
function withFractureTiles(game: Game): Game {
  const tiles = game.fracture.active
    ? Object.fromEntries(fractureSlots(game.fracture.seat, game.playerCount, loadPack(game.expansions), game.layout).map(s => [slotKeyOf(s.q, s.r), s.tileId]))
    : {};
  const old = game.fracture.tiles ?? {};
  const same = Object.keys(tiles).length === Object.keys(old).length && Object.entries(tiles).every(([slot, id]) => old[slot] === id);
  return same ? game : { ...game, fracture: { ...game.fracture, tiles } };
}

/** A round goes and the later ones close the gap; the plan keeps at least one. */
function withoutRound(plan: Plan, roundNo: number): Plan {
  if (plan.rounds.length <= 1 || !plan.rounds.some(r => r.number === roundNo)) return plan;
  return {
    ...plan,
    rounds: plan.rounds.filter(r => r.number !== roundNo).map(r => (r.number > roundNo ? { ...r, number: r.number - 1 } : r)),
  };
}

function copyOf(game: Game): Game {
  const source = game.plans.find(p => p.id === game.activePlanId);
  if (!source) return game;
  const copy: Plan = {
    id: newId(),
    name: defaultPlanName(game.plans.length + 1),
    rounds: structuredClone(source.rounds).map(r => ({ ...r, entries: copiedEntries(r.entries) })),
  };
  return { ...game, plans: [...game.plans, copy], activePlanId: copy.id };
}

export interface GameStore {
  game: Game | null;
  /** The list being set up before a game starts. Edits of the players and the layout go here while no game is open. */
  draft: Game;
  saveError: string | null;
  /**
   * The last save that could not be opened, or crashed once open, with why; `id` is null when the saves could not even be
   * listed. Cleared when a game opens or starts.
   */
  loadFailure: { id: string | null; error: string } | null;
  /** Saves that failed this session: the list offers only their export and deletion, never opens them on its own. */
  brokenSaves: Record<string, string>;
  /** The open game crashed while drawn: it closes, stays saved as it was, and is marked as failed. */
  crashGame(error: string): void;
  canUndo: boolean;
  newGame(input: { expansions: ExpansionId[]; playerCount: number; faction: string }, pack: DataPack): void;
  /** A link names a save and disagrees with it; nothing changes until the player chooses. */
  linkConflict: { share: ShareParams; savedId: string; name: string; differences: ShareDifference[]; taken: string[] } | null;
  /** Follows a link: finds the save it names, opens it, makes it, or asks. Without a name it only fills the draft. */
  openShareLink(search: string): Promise<void>;
  resolveLinkConflict(choice: { keepSaved: true } | { newName: string }): Promise<void>;
  /** Names the open game, or the draft while none is open. */
  setName(name: string): void;
  /** Turns the draft into the open game. */
  startGame(): void;
  /** Leaves the open game, which stays saved, for a new draft. */
  closeGame(): void;
  setDraftExpansions(expansions: ExpansionId[]): void;
  addOpponent(): void;
  /** Index among the opponents. */
  removeOpponent(index: number): void;
  setFaction(faction: string): void;
  /** Positions in the list of players, my faction being 0. */
  swapSeats(a: number, b: number): void;
  /** Loads a saved game by id; an unknown id leaves the current game alone. */
  openGame(id: string): Promise<void>;
  /** `owner` is the opponent it is expected of; without it the entry is mine. */
  addEntry(roundNo: number, body: EntryBody, phase: Phase, owner?: string): string;
  /** The round's one status entry: created on first use, its id afterwards. */
  addStatusEntry(roundNo: number): string;
  updateEntry(id: string, patch: Partial<EntryBody>): void;
  moveEntry(id: string, toPhase: Phase, toIndex: number): void;
  removeEntry(id: string): void;
  setEntryStatus(id: string, status: EntryStatus): void;
  /** Backup, then primary, then removed. */
  setStrategyCard(roundNo: number, initiative: number): void;
  addRound(): void;
  /** Later rounds take its number; the last round of a plan stays. */
  deleteRound(roundNo: number): void;
  copyPlan(): void;
  renamePlan(name: string): void;
  deletePlan(id: string): void;
  /** Puts a plan at this place among the plans. */
  movePlan(id: string, toIndex: number): void;
  setActivePlan(id: string): void;
  /** Turns an expansion on for the open game in one undo step; the draft has its own toggle. */
  addExpansion(id: ExpansionId): void;
  setTile(slotKey: string, tileId: string | null): void;
  /** Replaces the whole map in one undo step, and the layout too if one is given; the centre tile stays. */
  setMap(map: Record<string, string>, layout?: MapLayout): void;
  /** Switches the map template; see `changeLayout`. */
  setLayout(layout: MapLayout): void;
  setOpponent(index: number, patch: { faction: string }): void;
  /** Marks a ship upgrade by hand: `me` edits my baseline, an opponent id that opponent's list. */
  toggleUpgrade(player: string, unit: UnitId): void;
  setEnemyUnits(systemId: string, opponentId: string, units: UnitCounts): void;
  setEnemyGround(planetId: string, opponentId: string, units: UnitCounts): void;
  /** `owner` is `me`, an opponent id, or null for a free planet. */
  setPlanetControl(planetId: string, owner: string | null): void;
  /** Marks whether a planet has a space dock. */
  setDock(planetId: string, present: boolean): void;
  setPds(planetId: string, count: number): void;
  /** One tap on the big hex: edits the merged adjustment of that system and kind in the round. */
  changeAdjustment(roundNo: number, change: MergedChange): void;
  setSlice(id: string, owner: 'me' | 'other' | null): void;
  setThundersEdge(systemId: string | null): void;
  setFractureActive(active: boolean): void;
  /** Seat the Fracture group sits next to; null is the default edge. */
  setFractureSeat(seat: number | null): void;
  toggleIngress(systemId: string): void;
  undo(): void;
}

const DRAFT_EXPANSIONS: ExpansionId[] = ['pok', 'te'];
const newDraft = (expansions: ExpansionId[] = DRAFT_EXPANSIONS): Game =>
  createGame({ expansions, playerCount: 6, faction: '' }, loadPack(expansions));

let history: Game[] = [];
/** Writes run one after another so an older state can never overwrite a newer one. */
let pendingSave: Promise<void> = Promise.resolve();

/** Resolves once every save queued so far has finished. */
export const flushSaves = (): Promise<void> => pendingSave;

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
    const next = withFractureTiles(withFractureMoved(current, edit(current), loadPack(current.expansions)));
    if (next === current) return;
    history = [...history.slice(-(HISTORY_LIMIT - 1)), current];
    replace(next);
  };

  /** Applies a players edit to the open game, or to the draft while none is open: no undo step and no save there. */
  const commitPlayers = (edit: (game: Game, pack: DataPack) => Game): void => {
    if (get().game) commit(g => edit(g, loadPack(g.expansions)));
    else set(state => ({ draft: edit(state.draft, loadPack(state.draft.expansions)) }));
  };

  /** A save that would not open: the player is told, the save stays as it is. */
  const failLoad = (id: string | null, error: unknown): void => {
    const text = errorText(error);
    set(state => ({
      loadFailure: { id, error: text },
      brokenSaves: id === null ? state.brokenSaves : { ...state.brokenSaves, [id]: text },
    }));
  };

  const startFromShare = (share: ShareParams): void => {
    const game = draftFromShare(share, get().draft, loadPack);
    if (game.faction) {
      history = [];
      replace(placeStartUnits(game, loadPack(game.expansions)));
      set({ draft: newDraft(game.expansions) });
    } else {
      set({ draft: game });
    }
  };

  return {
    game: null,
    draft: newDraft(),
    saveError: null,
    loadFailure: null,
    brokenSaves: {},
    canUndo: false,
    linkConflict: null,

    newGame: (input, pack) => {
      history = [];
      replace(createGame(input, pack));
    },
    openShareLink: async search => {
      const share = readShareLink(search);
      if (!share || get().game) return;
      /** A game whose player is known starts at once; otherwise it waits in the draft for the choice of a faction. */
      if (!share.name) {
        set(state => ({ draft: draftFromShare(share, state.draft, loadPack) }));
        return;
      }
      let saves: Awaited<ReturnType<typeof listGames>>;
      try {
        saves = await listGames();
      } catch (error) {
        // Without the saves it is unknown whether the named one exists: the link only fills the draft.
        failLoad(null, error);
        set(state => ({ draft: draftFromShare(share, state.draft, loadPack) }));
        return;
      }
      const found = saves.find(save => save.name === share.name);
      let saved: Game | null;
      let differences: ShareDifference[];
      try {
        saved = found ? await loadGame(found.id) : null;
        differences = saved ? shareDifferences(share, saved, loadPack) : [];
      } catch (error) {
        // The named save is broken: a new game under its name would hide it, so nothing starts.
        failLoad(found?.id ?? null, error);
        return;
      }
      if (!saved) {
        startFromShare(share);
        return;
      }
      if (differences.length === 0) await get().openGame(saved.id);
      else set({ linkConflict: { share, savedId: saved.id, name: share.name, differences, taken: saves.flatMap(save => save.name ?? []) } });
    },
    resolveLinkConflict: async choice => {
      const conflict = get().linkConflict;
      if (!conflict) return;
      set({ linkConflict: null });
      if ('keepSaved' in choice) await get().openGame(conflict.savedId);
      else startFromShare({ ...conflict.share, name: choice.newName });
    },
    setName: name => commitPlayers(g => {
      const next = name.trim();
      if (next === (g.name ?? '')) return g;
      const { name: old, ...rest } = g;
      void old;
      return next ? { ...rest, name: next } : rest;
    }),
    startGame: () => {
      const { draft } = get();
      if (!draft.faction) return;
      history = [];
      replace(placeStartUnits(draft, loadPack(draft.expansions)));
      set({ draft: newDraft(draft.expansions), loadFailure: null });
    },
    closeGame: () => {
      history = [];
      set({ game: null, canUndo: false });
    },
    setDraftExpansions: expansions =>
      set(state => ({ draft: draftWithExpansions(state.draft, expansions, loadPack(expansions)) })),
    addOpponent: () => commitPlayers(addPlayer),
    removeOpponent: index => commitPlayers((g, pack) => removePlayer(g, index + 1, pack)),
    setFaction: faction => commitPlayers((g, pack) => setPlayerFaction(g, 0, faction, pack)),
    // The seats are settled when the game starts: its units and plans stand on them.
    swapSeats: (a, b) => { if (!get().game) commitPlayers((g, pack) => swapSeats(g, a, b, pack)); },
    openGame: async id => {
      let game: Game;
      try {
        const loaded = await loadGame(id);
        if (!loaded) return;
        game = withFractureTiles(loaded);
      } catch (error) {
        failLoad(id, error);
        return;
      }
      history = [];
      set(state => {
        const { [id]: fixed, ...brokenSaves } = state.brokenSaves;
        void fixed;
        return { game, canUndo: false, saveError: null, loadFailure: null, brokenSaves };
      });
    },
    crashGame: error => {
      const { game } = get();
      if (!game) return;
      history = [];
      set(state => ({
        game: null,
        canUndo: false,
        loadFailure: { id: game.id, error },
        brokenSaves: { ...state.brokenSaves, [game.id]: error },
      }));
    },

    addEntry: (roundNo, body, phase, owner) => {
      const id = newId();
      const entry = { ...body, id, phase, status: 'planned', ...(owner ? { owner } : {}) } as Entry;
      commit(g => editRound(g, roundNo, r => ({ ...r, entries: [...r.entries, entry] })));
      return id;
    },
    addStatusEntry: roundNo => {
      const { game } = get();
      const round = game?.plans.find(p => p.id === game.activePlanId)?.rounds.find(r => r.number === roundNo);
      return round?.entries.find(e => e.type === 'statusTokens')?.id
        ?? get().addEntry(roundNo, { type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0 }, 'status');
    },
    updateEntry: (id, patch) =>
      commit(g => editEntryRound(g, id, r => editEntries(r, es =>
        mapEntry(es, id, e => (Object.entries(patch).every(([k, v]) => (e as Record<string, unknown>)[k] === v)
          ? e : ({ ...e, ...patch } as Entry)))))),
    moveEntry: (id, toPhase, toIndex) =>
      commit(g => editEntryRound(g, id, r => editEntries(r, es => placeEntry(es, id, toPhase, toIndex)))),
    removeEntry: id =>
      commit(g => editEntryRound(g, id, r => editEntries(r, es => es.filter(e => e.id !== id && !(e.type === 'tactical' && e.fromCard === id))))),
    setEntryStatus: (id, status) =>
      commit(g => editEntryRound(g, id, r => editEntries(r, es =>
        mapEntry(es, id, e => (e.status === status ? e : { ...e, status }))))),
    setStrategyCard: (roundNo, initiative) => commit(g => editRound(g, roundNo, r => cycleCard(r, initiative, g.playerCount))),
    addRound: () =>
      commit(g => editPlan(g, plan => ({
        ...plan,
        rounds: [...plan.rounds, {
          number: Math.max(0, ...plan.rounds.map(r => r.number)) + 1, strategyCard: null, backupCard: null, entries: [],
        }],
      }))),
    deleteRound: roundNo => commit(g => editPlan(g, plan => withoutRound(plan, roundNo))),

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
    movePlan: (id, toIndex) =>
      commit(g => {
        const from = g.plans.findIndex(p => p.id === id);
        const to = Math.max(0, Math.min(toIndex, g.plans.length - 1));
        if (from < 0 || from === to) return g;
        const rest = g.plans.filter(p => p.id !== id);
        return { ...g, plans: [...rest.slice(0, to), g.plans[from], ...rest.slice(to)] };
      }),
    setActivePlan: id =>
      commit(g => (g.activePlanId === id || !g.plans.some(p => p.id === id) ? g : { ...g, activePlanId: id })),

    addExpansion: id =>
      commit(g => {
        if (g.expansions.includes(id)) return g;
        const expansions = DRAFT_EXPANSIONS.filter(e => e === id || g.expansions.includes(e));
        const next = { ...g, expansions };
        return id === 'te' ? withTeMecatol(next) : next;
      }),
    setTile: (slotKey, tileId) => commit(g => withField(g, 'map', setOrDelete(g.map, slotKey, tileId))),
    setMap: (map, layout) => commit(g => {
      const next = { ...map };
      delete next['0,0'];
      if (g.map['0,0']) next['0,0'] = g.map['0,0'];
      const same = Object.keys(next).length === Object.keys(g.map).length && Object.entries(next).every(([k, v]) => g.map[k] === v);
      const nextLayout = layout ?? g.layout;
      return same && nextLayout === g.layout ? g : { ...g, map: next, layout: nextLayout };
    }),
    setLayout: layout => commitPlayers((g, pack) => changeLayout(g, layout, pack)),
    setOpponent: (index, { faction }) => commitPlayers((g, pack) => setPlayerFaction(g, index + 1, faction, pack)),
    toggleUpgrade: (player, unit) => commit(g => toggleUpgrade(g, player, unit)),
    setEnemyUnits: (systemId, opponentId, units) =>
      commit(g => {
        const inSystem = g.enemyUnits[systemId] ?? {};
        if (sameUnits(inSystem[opponentId] ?? {}, units)) return g;
        const next = setOrDelete(inSystem, opponentId, hasUnits(units) ? units : null);
        return withField(g, 'enemyUnits', setOrDelete(g.enemyUnits, systemId, Object.keys(next).length > 0 ? next : null));
      }),
    setEnemyGround: (planetId, opponentId, units) =>
      commit(g => {
        const onPlanet = g.enemyGround[planetId] ?? {};
        if (sameUnits(onPlanet[opponentId] ?? {}, units)) return g;
        const next = setOrDelete(onPlanet, opponentId, hasUnits(units) ? units : null);
        return withField(g, 'enemyGround', setOrDelete(g.enemyGround, planetId, Object.keys(next).length > 0 ? next : null));
      }),
    setPlanetControl: (planetId, owner) =>
      commit(g => {
        const control = owner === null ? null : owner === 'me' ? 'me' : 'enemy';
        const planetControl = setOrDelete(g.planetControl, planetId, control);
        const planetOwner = setOrDelete(g.planetOwner, planetId, control === 'enemy' ? owner : null);
        return planetControl === g.planetControl && planetOwner === g.planetOwner ? g : { ...g, planetControl, planetOwner };
      }),
    setDock: (planetId, present) =>
      commit(g => {
        const pack = loadPack(g.expansions);
        if (startingDocks(g, pack).includes(planetId) === present) return g;
        // The dock on the tile at my seat is written down under my absent home planet.
        const standsThere = (id: string) => startingDocks({ ...g, docks: [id] }, pack).includes(planetId);
        return { ...g, docks: present ? [...g.docks, planetId] : g.docks.filter(id => !standsThere(id)) };
      }),
    setPds: (planetId, count) => commit(g => withField(g, 'pds', setOrDelete(g.pds, planetId, count > 0 ? count : null))),
    changeAdjustment: (roundNo, change) => commit(g => editRound(g, roundNo, r => changeOnBoard(g, r, change, loadPack(g.expansions), newId))),
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
    setFractureSeat: seat =>
      commit(g => (g.fracture.seat === seat ? g : { ...g, fracture: { ...g.fracture, seat } })),
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
