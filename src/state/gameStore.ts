import { create } from 'zustand';
import { loadPack } from '../data/loadPack';
import { changeOnBoard, type MergedChange } from '../domain/losses';
import { changeLayout, slotsFor } from '../domain/mapBuilder';
import { createGame } from '../domain/newGame';
import { draftFromShare, readShareLink, shareDifferences, type ShareDifference, type ShareParams } from '../domain/shareLink';
import { withTeMecatol } from '../domain/mecatol';
import { startingDocks, startingPds } from '../domain/strategy';
import { fractureSlots, withFractureMoved } from '../domain/thundersEdge';
import { setLeader, setStartHolding } from '../domain/holdings';
import { slotKeyOf } from '../domain/layouts';
import { placeStartUnits, withSeatHomes, addPlayer, draftWithExpansions, removePlayer, setPlayerFaction, swapSeats } from '../domain/players';
import type {
  DataPack, EntryBody, EntryStatus, ExpansionId, Game, MapLayout, LeaderState, Phase, UnitCounts,
} from '../domain/types';
import type { Turn } from '../game/actions';
import {
  copiedRounds, holdsTurn, withCardCycled, withRoundAdded, withTurnAdded, withTurnMoved, withTurnRemoved, withTurnReplaced,
  withTurnStatus, withoutRound,
} from '../game/edit/plan';
import { tableOf, planOf } from '../game/fromLegacy';
import type { Round } from '../game/round';
import type { SavedGame, SavedPlan } from '../game/save';
import { loadGame, listGames } from '../storage/db';
import { errorText } from '../storage/errorText';
import { gameOf, originOf, savedFor, savedOf } from '../storage/legacySave';
import { flushSaves, queueSave } from './autosave';
import * as history from './history';
import { patchedTurn, turnOfBody, viaGame } from './legacyEdits';
import { forgetTimelines } from './projection';

export { flushSaves };

const newId = (): string => globalThis.crypto.randomUUID();
const defaultPlanName = (position: number): string => `Plan ${position}`;

/** Maps a list but keeps the original array when no item changed, so no-op edits stay detectable by reference. */
function mapSame<T>(items: T[], edit: (item: T) => T): T[] {
  const next = items.map(edit);
  return next.every((item, i) => item === items[i]) ? items : next;
}

const activePlan = (saved: SavedGame): SavedPlan | undefined => saved.plans.find(p => p.id === saved.activePlanId);
const seated = (saved: SavedGame): number => saved.table.players.filter(p => p.seat < 100).length;

function editPlan(saved: SavedGame, edit: (plan: SavedPlan) => SavedPlan): SavedGame {
  const plans = mapSame(saved.plans, p => (p.id === saved.activePlanId ? edit(p) : p));
  return plans === saved.plans ? saved : { ...saved, plans };
}

function editRounds(plan: SavedPlan, pick: (round: Round) => boolean, edit: (round: Round) => Round): SavedPlan {
  const rounds = mapSame(plan.rounds, r => (pick(r) ? edit(r) : r));
  return rounds === plan.rounds ? plan : { ...plan, rounds };
}

/** Rewrites one round of the active plan. */
const editRound = (saved: SavedGame, roundNo: number, edit: (round: Round) => Round): SavedGame =>
  editPlan(saved, plan => editRounds(plan, r => r.number === roundNo, edit));

/** Rewrites the round of the active plan that holds the turn (or an action nested in it); other rounds stay as they were. */
const editTurnRound = (saved: SavedGame, turnId: string, edit: (round: Round) => Round): SavedGame =>
  editPlan(saved, plan => editRounds(plan, r => holdsTurn(r, turnId), edit));

function copyOf(saved: SavedGame): SavedGame {
  const source = activePlan(saved);
  if (!source) return saved;
  const copy: SavedPlan = { id: newId(), name: defaultPlanName(saved.plans.length + 1), rounds: copiedRounds(source.rounds, newId) };
  return { ...saved, plans: [...saved.plans, copy], activePlanId: copy.id };
}

function withField<K extends keyof Game>(game: Game, key: K, value: Game[K]): Game {
  return game[key] === value ? game : { ...game, [key]: value };
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

const hasUnits = (units: UnitCounts): boolean => Object.values(units).some(n => (n ?? 0) > 0);

/** The tiles of the open Fracture by slot. They follow its seat and the map's size. */
function withFractureTiles(game: Game): Game {
  const tiles = game.fracture.active
    ? Object.fromEntries(fractureSlots(game.fracture.seat, game.playerCount, loadPack(game.expansions), game.layout).map(s => [slotKeyOf(s.q, s.r), s.tileId]))
    : {};
  const old = game.fracture.tiles ?? {};
  const same = Object.keys(tiles).length === Object.keys(old).length && Object.entries(tiles).every(([slot, id]) => old[slot] === id);
  return same ? game : { ...game, fracture: { ...game.fracture, tiles } };
}

export interface GameStore {
  /** The open game, as the kernel holds a game: its table, its hand-placed start and its plans as rounds of turns. */
  saved: SavedGame | null;
  /** The setup being made before a game starts. Edits of the players and the layout go here while no game is open. */
  draftSaved: SavedGame;
  /** The open game read as the old `Game`, for the screens not yet moved to the kernel; derived from `saved`. */
  game: Game | null;
  /** The setup read as the old `Game`; derived from `draftSaved`. */
  draft: Game;
  saveError: string | null;
  /**
   * The last save that could not be opened, or crashed once open, with why; `id` is null when the saves could not even be
   * listed. `oldFormat`: an earlier version of the app saved it, which this one does not read. Cleared when a game opens
   * or starts.
   */
  loadFailure: { id: string | null; error: string; oldFormat?: true } | null;
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
  /** Adds a turn to a round of the open plan (its `id` is replaced): into the actions of the card turn `parentId` when given (Warfare's free action). Returns its id. */
  addTurn(roundNo: number, turn: Turn, parentId?: string): string;
  /** The round's one status turn: created on first use, its id afterwards. */
  addStatusTurn(roundNo: number): string;
  /** Replaces a turn, or an action nested in one, by its changed self. */
  updateTurn(id: string, next: Turn): void;
  moveTurn(id: string, toPhase: Phase, toIndex: number): void;
  /** A card turn takes its nested actions with it. */
  removeTurn(id: string): void;
  setStatus(id: string, status: EntryStatus): void;
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
  /** Replaces the whole map in one undo step, and the layout too if one is given; the centre tile stays, and so do the layout's hyperlanes where the map leaves their slots empty. */
  setMap(map: Record<string, string>, layout?: MapLayout): void;
  /** Switches the map template; see `changeLayout`. */
  setLayout(layout: MapLayout): void;
  setOpponent(index: number, patch: { faction: string }): void;
  /** Marks by hand what a player (`me` or an opponent id) held when the plan begins, by component id; a unit upgrade is its technology. */
  setStartHolding(player: string, id: string, present: boolean): void;
  /** Marks by hand a leader's state when the plan begins; `null` locks it again. */
  setLeader(player: string, id: string, state: LeaderState | null): void;
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
  // The writes of the old entries, for the tests of the screens that still make them; each is the turn edit above.
  addEntry(roundNo: number, body: EntryBody, phase: Phase, owner?: string): string;
  addStatusEntry(roundNo: number): string;
  updateEntry(id: string, patch: Partial<EntryBody>): void;
  moveEntry(id: string, toPhase: Phase, toIndex: number): void;
  removeEntry(id: string): void;
  setEntryStatus(id: string, status: EntryStatus): void;
}

const DRAFT_EXPANSIONS: ExpansionId[] = ['pok', 'te'];
const newDraft = (expansions: ExpansionId[] = DRAFT_EXPANSIONS): SavedGame =>
  savedOf(createGame({ expansions, playerCount: 6, faction: '' }, loadPack(expansions)));

export const useGame = create<GameStore>((set, get) => {
  const initialDraft = newDraft();

  const replace = (saved: SavedGame): void => {
    set({ saved, game: gameOf(saved), canUndo: history.size() > 0 });
    queueSave(saved, saveError => set({ saveError }));
  };

  /** Applies an edit to the open game; an edit that changes nothing leaves no undo step and no save. */
  const commit = (edit: (saved: SavedGame) => SavedGame): void => {
    const current = get().saved;
    if (!current) return;
    const next = edit(current);
    if (next === current) return;
    history.push(current);
    replace(next);
  };

  /** An edit of the setup, written over the old game: the Fracture follows what the edit changed. */
  const viaOld = (edit: (game: Game, pack: DataPack) => Game) => (saved: SavedGame): SavedGame =>
    viaGame(saved, (game, pack) => {
      const next = edit(game, pack);
      return next === game ? game : withFractureTiles(withFractureMoved(game, next, pack));
    });

  const commitOld = (edit: (game: Game, pack: DataPack) => Game): void => commit(viaOld(edit));

  /** Applies a players edit to the open game, or to the draft while none is open: no undo step and no save there. */
  const commitPlayers = (edit: (game: Game, pack: DataPack) => Game): void => {
    if (get().saved) commitOld(edit);
    else {
      const draftSaved = viaOld(edit)(get().draftSaved);
      set({ draftSaved, draft: gameOf(draftSaved) });
    }
  };

  const setDraft = (draftSaved: SavedGame): void => set({ draftSaved, draft: gameOf(draftSaved) });

  /** A save that would not open: the player is told, the save stays as it is. */
  const failLoad = (id: string | null, error: unknown): void => {
    const text = errorText(error);
    const oldFormat = typeof error === 'object' && error !== null && (error as { kind?: unknown }).kind === 'oldFormat';
    set(state => ({
      loadFailure: { id, error: text, ...(oldFormat ? { oldFormat: true as const } : {}) },
      brokenSaves: id === null ? state.brokenSaves : { ...state.brokenSaves, [id]: text },
    }));
  };

  const startFromShare = (share: ShareParams): void => {
    const game = draftFromShare(share, get().draft, loadPack);
    if (game.faction) {
      history.clear();
      replace(savedOf(placeStartUnits(game, loadPack(game.expansions))));
      setDraft(newDraft(game.expansions));
    } else {
      setDraft(savedOf(game));
    }
  };

  const store: GameStore = {
    saved: null,
    draftSaved: initialDraft,
    game: null,
    draft: gameOf(initialDraft),
    saveError: null,
    loadFailure: null,
    brokenSaves: {},
    canUndo: false,
    linkConflict: null,

    newGame: (input, pack) => {
      history.clear();
      replace(savedOf(createGame(input, pack)));
    },
    openShareLink: async search => {
      const share = readShareLink(search);
      if (!share || get().saved) return;
      /** A game whose player is known starts at once; otherwise it waits in the draft for the choice of a faction. */
      if (!share.name) {
        setDraft(savedOf(draftFromShare(share, get().draft, loadPack)));
        return;
      }
      let saves: Awaited<ReturnType<typeof listGames>>;
      try {
        saves = await listGames();
      } catch (error) {
        // Without the saves it is unknown whether the named one exists: the link only fills the draft.
        failLoad(null, error);
        setDraft(savedOf(draftFromShare(share, get().draft, loadPack)));
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
      const { draft, draftSaved } = get();
      if (!draft.faction) return;
      history.clear();
      replace(viaGame(draftSaved, (game, pack) => placeStartUnits(game, pack)));
      setDraft(newDraft(draft.expansions));
      set({ loadFailure: null });
    },
    closeGame: () => {
      history.clear();
      forgetTimelines();
      set({ saved: null, game: null, canUndo: false });
    },
    setDraftExpansions: expansions =>
      setDraft(viaGame(get().draftSaved, game => draftWithExpansions(game, expansions, loadPack(expansions)))),
    addOpponent: () => commitPlayers(addPlayer),
    removeOpponent: index => commitPlayers((g, pack) => removePlayer(g, index + 1, pack)),
    setFaction: faction => commitPlayers((g, pack) => setPlayerFaction(g, 0, faction, pack)),
    // The seats are settled when the game starts: its units and plans stand on them.
    swapSeats: (a, b) => { if (!get().saved) commitPlayers((g, pack) => swapSeats(g, a, b, pack)); },
    openGame: async id => {
      let saved: SavedGame;
      try {
        const loaded = await loadGame(id);
        if (!loaded) return;
        saved = viaGame(savedFor(loaded), game => withFractureTiles(game));
      } catch (error) {
        failLoad(id, error);
        return;
      }
      history.clear();
      set(state => {
        const { [id]: fixed, ...brokenSaves } = state.brokenSaves;
        void fixed;
        return { saved, game: gameOf(saved), canUndo: false, saveError: null, loadFailure: null, brokenSaves };
      });
    },
    crashGame: error => {
      const { saved } = get();
      if (!saved) return;
      history.clear();
      forgetTimelines();
      set(state => ({
        saved: null,
        game: null,
        canUndo: false,
        loadFailure: { id: saved.id, error },
        brokenSaves: { ...state.brokenSaves, [saved.id]: error },
      }));
    },

    addTurn: (roundNo, turn, parentId) => {
      const id = newId();
      commit(s => editRound(s, roundNo, r => withTurnAdded(r, { ...turn, id }, parentId)));
      return id;
    },
    addStatusTurn: roundNo => {
      const round = activePlan(get().saved!)?.rounds.find(r => r.number === roundNo);
      return round?.turns.find(t => t.action.kind === 'status')?.id
        ?? get().addTurn(roundNo, { id: '', player: get().saved!.table.viewer, status: 'planned', phase: 'status', action: { kind: 'status', tactic: 0, fleet: 0, strategy: 0 }, acts: [], used: [] });
    },
    updateTurn: (id, next) => commit(s => editTurnRound(s, id, r => withTurnReplaced(r, id, next))),
    moveTurn: (id, toPhase, toIndex) => commit(s => editTurnRound(s, id, r => withTurnMoved(r, id, toPhase, toIndex))),
    removeTurn: id => commit(s => editTurnRound(s, id, r => withTurnRemoved(r, id))),
    setStatus: (id, status) => commit(s => editTurnRound(s, id, r => withTurnStatus(r, id, status))),
    setStrategyCard: (roundNo, initiative) =>
      commit(s => editRound(s, roundNo, r => withCardCycled(r, initiative, seated(s), s.table.viewer))),
    addRound: () => commit(s => editPlan(s, plan => ({ ...plan, rounds: withRoundAdded(plan.rounds) }))),
    deleteRound: roundNo => commit(s => editPlan(s, plan => {
      const rounds = withoutRound(plan.rounds, roundNo);
      return rounds === plan.rounds ? plan : { ...plan, rounds };
    })),

    copyPlan: () => commit(copyOf),
    renamePlan: name =>
      commit(s => editPlan(s, plan => {
        const next = name.trim() || defaultPlanName(s.plans.findIndex(p => p.id === plan.id) + 1);
        return next === plan.name ? plan : { ...plan, name: next };
      })),
    deletePlan: id =>
      commit(s => {
        if (s.plans.length <= 1 || !s.plans.some(p => p.id === id)) return s;
        const plansLeft = s.plans.filter(p => p.id !== id);
        return { ...s, plans: plansLeft, activePlanId: s.activePlanId === id ? plansLeft[0].id : s.activePlanId };
      }),
    movePlan: (id, toIndex) =>
      commit(s => {
        const from = s.plans.findIndex(p => p.id === id);
        const to = Math.max(0, Math.min(toIndex, s.plans.length - 1));
        if (from < 0 || from === to) return s;
        const rest = s.plans.filter(p => p.id !== id);
        return { ...s, plans: [...rest.slice(0, to), s.plans[from], ...rest.slice(to)] };
      }),
    setActivePlan: id =>
      commit(s => (s.activePlanId === id || !s.plans.some(p => p.id === id) ? s : { ...s, activePlanId: id })),

    addExpansion: id =>
      commitOld(g => {
        if (g.expansions.includes(id)) return g;
        const expansions = DRAFT_EXPANSIONS.filter(e => e === id || g.expansions.includes(e));
        const next = { ...g, expansions };
        return id === 'te' ? withTeMecatol(next) : next;
      }),
    // The map is built on the draft too, before the game starts.
    setTile: (slotKey, tileId) => commitPlayers(g => withField(g, 'map', setOrDelete(g.map, slotKey, tileId))),
    setMap: (map, layout) => commitPlayers((g, pack) => {
      const next = { ...map };
      delete next['0,0'];
      if (g.map['0,0']) next['0,0'] = g.map['0,0'];
      // The hyperlanes of the layout stay where the string leaves their slots empty.
      for (const slot of slotsFor(g.playerCount, pack, layout ?? g.layout)) {
        if (slot.fixed && !next[slotKeyOf(slot.q, slot.r)]) next[slotKeyOf(slot.q, slot.r)] = slot.fixed;
      }
      const nextLayout = layout ?? g.layout;
      // A 0 on a home slot leaves it to the faction seated there.
      const placed = withSeatHomes({ ...g, map: next, layout: nextLayout }, pack);
      const same = Object.keys(placed.map).length === Object.keys(g.map).length && Object.entries(placed.map).every(([k, v]) => g.map[k] === v);
      return same && nextLayout === g.layout ? g : placed;
    }),
    setLayout: layout => commitPlayers((g, pack) => changeLayout(g, layout, pack)),
    setOpponent: (index, { faction }) => commitPlayers((g, pack) => setPlayerFaction(g, index + 1, faction, pack)),
    setStartHolding: (player, id, present) => commitOld(g => setStartHolding(g, player, id, present)),
    setLeader: (player, id, state) => commitOld(g => setLeader(g, player, id, state)),
    setEnemyUnits: (systemId, opponentId, units) =>
      commitOld(g => {
        const inSystem = g.enemyUnits[systemId] ?? {};
        if (sameUnits(inSystem[opponentId] ?? {}, units)) return g;
        const next = setOrDelete(inSystem, opponentId, hasUnits(units) ? units : null);
        return withField(g, 'enemyUnits', setOrDelete(g.enemyUnits, systemId, Object.keys(next).length > 0 ? next : null));
      }),
    setEnemyGround: (planetId, opponentId, units) =>
      commitOld(g => {
        const onPlanet = g.enemyGround[planetId] ?? {};
        if (sameUnits(onPlanet[opponentId] ?? {}, units)) return g;
        const next = setOrDelete(onPlanet, opponentId, hasUnits(units) ? units : null);
        return withField(g, 'enemyGround', setOrDelete(g.enemyGround, planetId, Object.keys(next).length > 0 ? next : null));
      }),
    setPlanetControl: (planetId, owner) =>
      commitOld(g => {
        const control = owner === null ? null : owner === 'me' ? 'me' : 'enemy';
        const planetControl = setOrDelete(g.planetControl, planetId, control);
        const planetOwner = setOrDelete(g.planetOwner, planetId, control === 'enemy' ? owner : null);
        return planetControl === g.planetControl && planetOwner === g.planetOwner ? g : { ...g, planetControl, planetOwner };
      }),
    setDock: (planetId, present) =>
      commitOld(g => {
        const pack = loadPack(g.expansions);
        if (startingDocks(g, pack).includes(planetId) === present) return g;
        // The dock on the tile at my seat is written down under my absent home planet.
        const standsThere = (id: string) => startingDocks({ ...g, docks: [id] }, pack).includes(planetId);
        return { ...g, docks: present ? [...g.docks, planetId] : g.docks.filter(id => !standsThere(id)) };
      }),
    setPds: (planetId, count) => commitOld(g => {
      // What stands under my absent home planets moves to the planets where it stands now (as setDock does).
      const standing = startingPds(g, loadPack(g.expansions));
      return (standing[planetId] ?? 0) === Math.max(0, count) ? g : { ...g, pds: setOrDelete(standing, planetId, count > 0 ? count : null) };
    }),
    changeAdjustment: (roundNo, change) => commit(s => {
      const round = activePlan(s)?.rounds.find(r => r.number === roundNo);
      if (!round) return s;
      const game = gameOf(s);
      const pack = loadPack(game.expansions);
      const old = game.plans.find(p => p.id === s.activePlanId)?.rounds.find(r => r.number === roundNo);
      if (!old) return s;
      const changed = changeOnBoard(game, old, change, pack, newId);
      if (changed === old) return s;
      const [made] = planOf(tableOf(game), { rounds: [changed] } as Parameters<typeof planOf>[1], pack);
      return editRound(s, roundNo, () => made);
    }),
    setSlice: (id, owner) =>
      commitOld(g => {
        const slices = setOrDelete(g.expedition.slices, id, owner);
        return slices === g.expedition.slices ? g : { ...g, expedition: { ...g.expedition, slices } };
      }),
    setThundersEdge: systemId =>
      commitOld(g => (g.expedition.thundersEdgeSystem === systemId
        ? g : { ...g, expedition: { ...g.expedition, thundersEdgeSystem: systemId } })),
    setFractureActive: active =>
      commitOld(g => (g.fracture.active === active ? g : { ...g, fracture: { ...g.fracture, active } })),
    setFractureSeat: seat =>
      commitOld(g => (g.fracture.seat === seat ? g : { ...g, fracture: { ...g.fracture, seat } })),
    toggleIngress: systemId =>
      commitOld(g => ({
        ...g,
        fracture: {
          ...g.fracture,
          ingress: g.fracture.ingress.includes(systemId)
            ? g.fracture.ingress.filter(s => s !== systemId)
            : [...g.fracture.ingress, systemId],
        },
      })),

    undo: () => {
      const previous = history.pop();
      if (previous) replace(previous);
    },

    addEntry: (roundNo, body, phase, owner) => {
      const saved = get().saved;
      if (!saved) return '';
      const { turn, parentId } = turnOfBody(saved, '', body, phase, owner);
      return get().addTurn(roundNo, turn, parentId);
    },
    addStatusEntry: roundNo => get().addStatusTurn(roundNo),
    updateEntry: (id, patch) => {
      const saved = get().saved;
      const next = saved ? patchedTurn(saved, id, patch) : undefined;
      if (next) get().updateTurn(id, next);
    },
    moveEntry: (id, toPhase, toIndex) => get().moveTurn(id, toPhase, toIndex),
    removeEntry: id => get().removeTurn(id),
    setEntryStatus: (id, status) => get().setStatus(id, status),
  };
  return store;
});

// The screens not yet moved, and the tests, still set `game` and `draft` by hand: the saved game follows what they set.
useGame.subscribe((state, previous) => {
  if (state.game !== previous.game && state.saved === previous.saved) {
    if (state.game === null) useGame.setState({ saved: null });
    else if (!originOf(state.game)) useGame.setState({ saved: savedFor(state.game) });
    else if (state.game !== (state.saved && gameOf(state.saved))) useGame.setState({ saved: originOf(state.game) });
  }
  if (state.draft !== previous.draft && state.draftSaved === previous.draftSaved && state.draft !== gameOf(state.draftSaved)) {
    useGame.setState({ draftSaved: savedFor(state.draft) });
  }
});

