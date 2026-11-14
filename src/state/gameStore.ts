import { create } from 'zustand';
import { loadPack } from '../data/loadPack';
import type { MergedChange } from '../domain/losses';
import { changeOnBoard } from '../game/edit/merged';
import { draftFromShare, readShareLink, shareDifferences, type ShareDifference, type ShareParams } from '../domain/shareLink';
import type {
  DataPack, EntryStatus, ExpansionId, Game, MapLayout, LeaderState, Phase, UnitCounts,
} from '../domain/types';
import type { Turn } from '../game/actions';
import {
  copiedRounds, holdsTurn, withCardCycled, withRoundAdded, withTurnAdded, withTurnMoved, withTurnRemoved, withTurnReplaced,
  withTurnStatus, withoutRound,
} from '../game/edit/plan';
import type { Round } from '../game/round';
import type { SavedGame, SavedPlan } from '../game/save';
import { loadGame, listGames } from '../storage/db';
import { errorText } from '../storage/errorText';
import { gameOf, originOf, savedFor } from '../testing/legacySave';
import { flushSaves, queueSave } from './autosave';
import * as history from './history';
import {
  withControl, withDock, withFractureActive, withFractureSeat, withGroundAt, withIngressToggled, withLeader, withPds, withSlice,
  withFractureTiles, withStartHolding, withThundersEdge, withUnitsAt,
} from '../game/edit/start';
import {
  addExpansion, addPlayer, changeLayout, createSaved, draftWithExpansions, removePlayer, setFaction, startedGame, swapSeats, withMap, withName,
  withTile,
} from '../game/edit/table';
import { playerOfLegacy } from '../game/entry';
import { forgetTimelines, startOfSaved } from './projection';

export { flushSaves };

const newId = (): string => globalThis.crypto.randomUUID();
const defaultPlanName = (position: number): string => `Plan ${position}`;

/** Maps a list but keeps the original array when no item changed, so no-op edits stay detectable by reference. */
function mapSame<T>(items: T[], edit: (item: T) => T): T[] {
  const next = items.map(edit);
  return next.every((item, i) => item === items[i]) ? items : next;
}

/** The kernel player an old id (`me`, an opponent's id) stands for. */
const pid = (saved: SavedGame, legacy: string): string => playerOfLegacy(saved.table, legacy) ?? legacy;

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
}

const DRAFT_EXPANSIONS: ExpansionId[] = ['pok', 'te'];
const newDraft = (expansions: ExpansionId[] = DRAFT_EXPANSIONS): SavedGame =>
  createSaved({ expansions, playerCount: 6, faction: '' }, loadPack(expansions));

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

  /** An edit of the table written over the saved game: to the open game, or to the draft while none is open. */
  const commitSetup = (edit: (saved: SavedGame) => SavedGame): void => {
    if (get().saved) commit(edit);
    else setDraft(edit(get().draftSaved));
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
    game: null,
    draft: gameOf(initialDraft),
    saveError: null,
    loadFailure: null,
    brokenSaves: {},
    canUndo: false,
    linkConflict: null,

    newGame: (input, pack) => {
      history.clear();
      replace(createSaved(input, pack));
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
      // The opponents stand at their seats with what their sheets give, written in the save so the Setup mode can edit it.
      replace(startedGame(draftSaved));
      setDraft(newDraft(draftSaved.table.expansions));
      set({ loadFailure: null });
    },
    closeGame: () => {
      history.clear();
      forgetTimelines();
      set({ saved: null, game: null, canUndo: false });
    },
    setDraftExpansions: expansions => setDraft(draftWithExpansions(get().draftSaved, expansions)),
    addOpponent: () => commitSetup(s => addPlayer(s)),
    removeOpponent: index => commitSetup(s => removePlayer(s, index + 1)),
    setFaction: faction => commitSetup(s => setFaction(s, 0, faction)),
    // The seats are settled when the game starts: its units and plans stand on them.
    swapSeats: (a, b) => { if (!get().saved) commitSetup(s => swapSeats(s, a, b)); },
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

    addExpansion: id => commit(s => addExpansion(s, id)),
    // The map is built on the draft too, before the game starts.
    setTile: (slotKey, tileId) => commitSetup(saved => withTile(saved, slotKey, tileId)),
    setMap: (map, layout) => commitSetup(saved => withMap(saved, map, layout)),
    setLayout: layout => commitSetup(saved => changeLayout(saved, layout)),
    setOpponent: (index, { faction }) => commitSetup(saved => setFaction(saved, index + 1, faction)),
    setStartHolding: (player, id, present) => commit(s => withStartHolding(s, pid(s, player), id, present)),
    setLeader: (player, id, state) => commit(s => withLeader(s, pid(s, player), id, state)),
    setEnemyUnits: (systemId, opponentId, units) => commit(s => withUnitsAt(s, systemId, pid(s, opponentId), units)),
    setEnemyGround: (planetId, opponentId, units) => commit(s => withGroundAt(s, planetId, pid(s, opponentId), units)),
    setPlanetControl: (planetId, owner) => commit(s => withControl(s, planetId, owner === null ? null : pid(s, owner))),
    setDock: (planetId, present) => commit(s => withDock(s, planetId, present)),
    setPds: (planetId, count) => commit(s => withPds(s, planetId, count)),
    changeAdjustment: (roundNo, change) => commit(s => {
      const plan = activePlan(s);
      const round = plan?.rounds.find(r => r.number === roundNo);
      if (!plan || !round) return s;
      const pack = loadPack(s.table.expansions);
      const { table, start } = startOfSaved(s, pack);
      const made = changeOnBoard(table, start, pack, plan.rounds, roundNo, change, newId);
      return !made || made === round ? s : editRound(s, roundNo, () => made);
    }),
    setSlice: (id, owner) => commit(s => withSlice(s, id, owner === null ? null : owner === 'me' ? s.table.viewer : s.table.players.find(q => q.id !== s.table.viewer)?.id ?? 'other')),
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

