import { create } from 'zustand';
import { loadPack } from '../data/loadPack';
import type { MergedChange } from '../domain/losses';
import { changeOnBoard } from '../game/edit/merged';
import { draftFromShare, readShareLink, shareDifferences, type ShareDifference, type ShareParams } from '../domain/shareLink';
import type {
  DataPack, EntryStatus, ExpansionId, MapLayout, LeaderState, Phase, UnitCounts,
} from '../domain/types';
import type { Turn } from '../game/actions';
import {
  copiedRounds, holdsTurn, withCardCycled, withRoundAdded, withTurnAdded, withTurnMoved, withTurnRemoved, withTurnReplaced,
  withTurnStatus, withoutRound,
} from '../game/edit/plan';
import type { Round } from '../game/round';
import type { SavedGame, SavedPlan } from '../game/save';
import type { PlayerId } from '../game/types';
import { loadGame, listGames } from '../storage/db';
import { errorText } from '../storage/errorText';

import { flushSaves, queueSave } from './autosave';
import * as history from './history';
import {
  withControl, withDock, withFractureActive, withFractureSeat, withGroundAt, withIngressToggled, withLeader, withPds, withSlice,
  withFractureTiles, withStartHolding, withThundersEdge, withUnitsAt,
} from '../game/edit/start';
import {
  addExpansion, addPlayer, changeLayout, createSaved, draftWithExpansions, removePlayer, seatedCount, setFaction, setViewer, startedGame, swapSeats, withMap,
  withName, withTile,
} from '../game/edit/table';
import { forgetTimelines, startOfSaved } from './projection';

export { flushSaves };

const newId = (): string => globalThis.crypto.randomUUID();
const defaultPlanName = (position: number): string => `Plan ${position}`;

/** Maps a list but keeps the original array when no item changed, so no-op edits stay detectable by reference. */
function mapSame<T>(items: T[], edit: (item: T) => T): T[] {
  const next = items.map(edit);
  return next.every((item, i) => item === items[i]) ? items : next;
}

const activePlan = (saved: SavedGame): SavedPlan | undefined => saved.plans.find(p => p.id === saved.activePlanId);

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

export interface GameStore {
  /** The open game, as the kernel holds a game: its table, its hand-placed start and its plans as rounds of turns. */
  saved: SavedGame | null;
  /** The setup being made before a game starts. Edits of the players and the layout go here while no game is open. */
  draftSaved: SavedGame;
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
  /** A game begun at once, without the draft: `faction` sits at the first seat, which is the one at the tablet. */
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
  /** The players are equal: each edit names one by id. A new player takes the last seat. */
  addPlayer(): void;
  /** Any player may leave; the tablet goes to the first of the rest by seat when its player does. The last three stay. */
  removePlayer(player: PlayerId): void;
  setFaction(player: PlayerId, faction: string): void;
  /** Two players trade seats, and with them their ids; only before the game starts. */
  swapSeats(a: PlayerId, b: PlayerId): void;
  /** Who sits at the tablet: a mark on one of the players; only before the game starts. */
  setViewer(player: PlayerId): void;
  /** Loads a saved game by id; an unknown id leaves the current game alone. */
  openGame(id: string): Promise<void>;
  /** Adds a turn to a round of the open plan (its `id` is replaced): into the actions of the card turn `parentId` when given (Warfare's free action). Returns its id. */
  addTurn(roundNo: number, turn: Turn, parentId?: string): string;
  /** The round's one status turn: created on first use as `player`'s, its id afterwards. */
  addStatusTurn(roundNo: number, player: PlayerId): string;
  /** Replaces a turn, or an action nested in one, by its changed self. */
  updateTurn(id: string, next: Turn): void;
  moveTurn(id: string, toPhase: Phase, toIndex: number): void;
  /** A card turn takes its nested actions with it. */
  removeTurn(id: string): void;
  setStatus(id: string, status: EntryStatus): void;
  /** A strategy card of `player` in a round: backup, then primary, then removed. */
  setStrategyCard(roundNo: number, player: PlayerId, initiative: number): void;
  /** A round more, keeping the strategy cards of `planned`. */
  addRound(planned: PlayerId): void;
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
  /** Marks by hand what a player held when the plan begins, by component id; a unit upgrade is its technology. */
  setStartHolding(player: string, id: string, present: boolean): void;
  /** Marks by hand a leader's state when the plan begins; `null` locks it again. */
  setLeader(player: string, id: string, state: LeaderState | null): void;
  /** The units of a player written for the start, in a system's space and on a planet. */
  setUnits(systemId: string, player: PlayerId, units: UnitCounts): void;
  setGround(planetId: string, player: PlayerId, units: UnitCounts): void;
  /** `owner` is the player who controls the planet at the start, or null for a free planet. */
  setPlanetControl(planetId: string, owner: PlayerId | null): void;
  /** Marks whether a planet has a space dock. */
  setDock(planetId: string, present: boolean): void;
  setPds(planetId: string, count: number): void;
  /** One tap on the big hex: edits the merged adjustment of `player`'s units of that system and kind in the round. */
  changeAdjustment(roundNo: number, change: MergedChange, player: PlayerId): void;
  /** Who took an expedition part before the plan (null: free). */
  setSlice(id: string, owner: PlayerId | null): void;
  setThundersEdge(systemId: string | null): void;
  setFractureActive(active: boolean): void;
  /** Seat the Fracture group sits next to; null is the default edge. */
  setFractureSeat(seat: number | null): void;
  toggleIngress(systemId: string): void;
  undo(): void;
}

const DRAFT_EXPANSIONS: ExpansionId[] = ['pok', 'te'];
const newDraft = (expansions: ExpansionId[] = DRAFT_EXPANSIONS): SavedGame =>
  createSaved({ expansions, playerCount: 6 }, loadPack(expansions));

export const useGame = create<GameStore>((set, get) => {
  const initialDraft = newDraft();

  const replace = (saved: SavedGame): void => {
    set({ saved, canUndo: history.size() > 0 });
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

  /** An edit of the table written over the saved game: to the open game, or to the draft while none is open. */
  const commitSetup = (edit: (saved: SavedGame) => SavedGame): void => {
    if (get().saved) commit(edit);
    else setDraft(edit(get().draftSaved));
  };

  const setDraft = (draftSaved: SavedGame): void => set({ draftSaved });

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
    const game = draftFromShare(share, get().draftSaved, loadPack);
    if (game.table.players.find(p => p.id === game.table.viewer)?.faction) {
      history.clear();
      replace(startedGame(game));
      setDraft(newDraft(game.table.expansions));
    } else {
      setDraft(game);
    }
  };

  const store: GameStore = {
    saved: null,
    draftSaved: initialDraft,
    saveError: null,
    loadFailure: null,
    brokenSaves: {},
    canUndo: false,
    linkConflict: null,

    newGame: (input, pack) => {
      history.clear();
      replace(startedGame(createSaved(input, pack)));
    },
    openShareLink: async search => {
      const share = readShareLink(search);
      if (!share || get().saved) return;
      /** A game whose player is known starts at once; otherwise it waits in the draft for the choice of a faction. */
      if (!share.name) {
        setDraft(draftFromShare(share, get().draftSaved, loadPack));
        return;
      }
      let saves: Awaited<ReturnType<typeof listGames>>;
      try {
        saves = await listGames();
      } catch (error) {
        // Without the saves it is unknown whether the named one exists: the link only fills the draft.
        failLoad(null, error);
        setDraft(draftFromShare(share, get().draftSaved, loadPack));
        return;
      }
      const found = saves.find(save => save.name === share.name);
      let saved: SavedGame | null;
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
    setName: name => commitSetup(saved => withName(saved, name)),
    startGame: () => {
      const { draftSaved } = get();
      if (!draftSaved.table.players.find(p => p.id === draftSaved.table.viewer)?.faction) return;
      history.clear();
      // Every player stands at their home with what their sheet gives, written in the save so the Setup mode can edit it.
      replace(startedGame(draftSaved));
      setDraft(newDraft(draftSaved.table.expansions));
      set({ loadFailure: null });
    },
    closeGame: () => {
      history.clear();
      forgetTimelines();
      set({ saved: null, canUndo: false });
    },
    setDraftExpansions: expansions => setDraft(draftWithExpansions(get().draftSaved, expansions)),
    addPlayer: () => commitSetup(s => addPlayer(s)),
    removePlayer: player => commitSetup(s => removePlayer(s, player)),
    setFaction: (player, faction) => commitSetup(s => setFaction(s, player, faction)),
    // The seats are settled when the game starts: its units and plans stand on them. So is the tablet: the plans are its player's.
    swapSeats: (a, b) => { if (!get().saved) commitSetup(s => swapSeats(s, a, b)); },
    setViewer: player => { if (!get().saved) commitSetup(s => setViewer(s, player)); },
    openGame: async id => {
      let saved: SavedGame;
      try {
        const loaded = await loadGame(id);
        if (!loaded) return;
        saved = withFractureTiles(loaded);
      } catch (error) {
        failLoad(id, error);
        return;
      }
      history.clear();
      set(state => {
        const { [id]: fixed, ...brokenSaves } = state.brokenSaves;
        void fixed;
        return { saved, canUndo: false, saveError: null, loadFailure: null, brokenSaves };
      });
    },
    crashGame: error => {
      const { saved } = get();
      if (!saved) return;
      history.clear();
      forgetTimelines();
      set(state => ({
        saved: null,
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
    addStatusTurn: (roundNo, player) => {
      const round = activePlan(get().saved!)?.rounds.find(r => r.number === roundNo);
      return round?.turns.find(t => t.action.kind === 'status')?.id
        ?? get().addTurn(roundNo, { id: '', player, status: 'planned', phase: 'status', action: { kind: 'status', tactic: 0, fleet: 0, strategy: 0 }, acts: [], used: [] });
    },
    updateTurn: (id, next) => commit(s => editTurnRound(s, id, r => withTurnReplaced(r, id, next))),
    moveTurn: (id, toPhase, toIndex) => commit(s => editTurnRound(s, id, r => withTurnMoved(r, id, toPhase, toIndex))),
    removeTurn: id => commit(s => editTurnRound(s, id, r => withTurnRemoved(r, id))),
    setStatus: (id, status) => commit(s => editTurnRound(s, id, r => withTurnStatus(r, id, status))),
    setStrategyCard: (roundNo, player, initiative) =>
      commit(s => editRound(s, roundNo, r => withCardCycled(r, initiative, seatedCount(s.table), player))),
    addRound: planned => commit(s => editPlan(s, plan => ({ ...plan, rounds: withRoundAdded(plan.rounds, [planned]) }))),
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

    addExpansion: id => commit(s => addExpansion(s, id)),
    // The map is built on the draft too, before the game starts.
    setTile: (slotKey, tileId) => commitSetup(saved => withTile(saved, slotKey, tileId)),
    setMap: (map, layout) => commitSetup(saved => withMap(saved, map, layout)),
    setLayout: layout => commitSetup(saved => changeLayout(saved, layout)),
    setStartHolding: (player, id, present) => commit(s => withStartHolding(s, player, id, present)),
    setLeader: (player, id, state) => commit(s => withLeader(s, player, id, state)),
    setUnits: (systemId, player, units) => commit(s => withUnitsAt(s, systemId, player, units)),
    setGround: (planetId, player, units) => commit(s => withGroundAt(s, planetId, player, units)),
    setPlanetControl: (planetId, owner) => commit(s => withControl(s, planetId, owner)),
    setDock: (planetId, present) => commit(s => withDock(s, planetId, present)),
    setPds: (planetId, count) => commit(s => withPds(s, planetId, count)),
    changeAdjustment: (roundNo, change, player) => commit(s => {
      const plan = activePlan(s);
      const round = plan?.rounds.find(r => r.number === roundNo);
      if (!plan || !round) return s;
      const pack = loadPack(s.table.expansions);
      const { table, start } = startOfSaved(s, pack);
      const made = changeOnBoard(table, start, pack, plan.rounds, roundNo, change, newId, player);
      return !made || made === round ? s : editRound(s, roundNo, () => made);
    }),
    setSlice: (id, owner) => commit(s => withSlice(s, id, owner)),
    setThundersEdge: systemId => commit(s => withThundersEdge(s, systemId)),
    setFractureActive: active => commit(s => withFractureActive(s, active)),
    setFractureSeat: seat => commit(s => withFractureSeat(s, seat)),
    toggleIngress: systemId => commit(s => withIngressToggled(s, systemId)),

    undo: () => {
      const previous = history.pop();
      if (previous) replace(previous);
    },
  };
  return store;
});



