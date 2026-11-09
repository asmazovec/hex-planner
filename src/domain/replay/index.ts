/**
 * The replay of a plan: rounds in order, each by its phases (LRR 40), each entry by its own steps. The state is never
 * stored: "now" replays the done entries, the forecast the done and planned ones. Opponents are counted the same way.
 */
import { blockersOf, routeReach as reachOf, type Blockers } from '../movement';
import { gameAs } from '../players';
import { placeIn } from '../rules/registry';
import type { DataPack, Entry, Game, GameState, Plan, Projection, Warning } from '../types';
import { applyCard, cardRound } from './cards';
import type { CardRound } from './cards/index';
import { applyActs, type ActContext } from './acts';
import { applyDetachedExpedition } from './expedition';
import { rivalLandings } from './invasion';
import { checkFlow, PHASE_ORDER, roundFlow, type RoundFlow } from './round';
import { applyAdjustment, initialState } from './state';
import { applyStatusTokens, clearBoard } from './status';
import { keepOwnStructures } from './structures';
import { applyTactical } from './tactical';

export { isOnMap, sourceSlot, systemPlanets, systemsAdjacent, systemSlots, tileIdOf } from './board';
export { fleetSpeed, routeDistances, routeMove, routeSteps, shipSpeed } from '../movement';
export { readyInfluence, readyResources } from './payment';
export { placesOf, productionCost, type ProductionPlace } from './production';
export { START_TOKENS } from './state';
export { planetStructureWarnings, structureOwner, structuresOn } from './structures';
export { productionPlaces, tacticalMeters } from './tactical';
export { boardSystemWarnings, dockFighterRoom, fightersFly, pickupAllowed, systemMeters } from './transport';

function applyEntry(
  game: Game, state: GameState, entry: Entry, pack: DataPack, acts: ActContext, cards: CardRound, flow: RoundFlow, blockers?: Blockers,
  withActs = true,
): Warning[] {
  const warnings: Warning[] = checkFlow(game, entry, flow, cards.primaries[entry.owner ?? 'me'] ?? []);
  switch (entry.type) {
    case 'tactical':
      applyTactical(game, state, entry, pack, warnings, blockers);
      break;
    case 'strategic':
    case 'secondary':
      applyCard(game, state, entry, pack, cards, warnings);
      break;
    case 'expedition':
      applyDetachedExpedition(game, state, entry, pack, acts.taken, warnings);
      break;
    case 'statusTokens':
      applyStatusTokens(game, state, entry, pack, warnings);
      break;
    case 'adjustment':
      applyAdjustment(state, entry, warnings);
      break;
    case 'component':
    case 'pass':
      break;
  }
  // The acts of a turn come after its action: transactions, then the expedition at its end.
  if (withActs) applyActs(game, state, entry, pack, acts, warnings);
  return placeIn(warnings, entry.id);
}

/** An opponent counted like me: what stands on the map for them is where they begin. */
function rivalState(game: Game, view: Game, id: string, pack: DataPack): GameState {
  const pick = (record: Game['enemyUnits']) => Object.fromEntries(Object.entries(record).flatMap(([place, byOwner]) => (byOwner[id] ? [[place, { ...byOwner[id] }]] : [])));
  const state: GameState = { ...initialState(view, pack), systems: pick(game.enemyUnits), ground: pick(game.enemyGround) };
  keepOwnStructures(state, false);
  return state;
}

function replay(game: Game, plan: Plan, filter: 'now' | 'forecast', pack: DataPack, stopBefore?: string, stopAfter?: string): Projection {
  const state = initialState(game, pack);
  keepOwnStructures(state, true);
  const warningsByEntry: Record<string, Warning[]> = {};
  const views = new Map(game.opponents.map(o => [o.id, gameAs(game, o.id)]));
  const rivals: Record<string, GameState> = Object.fromEntries(game.opponents.map(o => [o.id, rivalState(game, views.get(o.id)!, o.id, pack)]));
  if (game.opponents.length > 0) {
    state.rivals = rivals;
    state.rivalHolds = {};
  }
  const everyone = [state, ...Object.values(rivals)];
  const acts: ActContext = { taken: new Set<string>(), states: { me: state, ...rivals } };
  const rounds = [...plan.rounds].sort((a, b) => a.number - b.number);
  for (const round of rounds) {
    // The agenda phase ends by readying the planets (LRR 8), so a round begins with them ready and the board clear.
    clearBoard(everyone);
    // The status phase clears the board (81.4) and readies the planets (81.6) once, after its tokens are gained, and in any case before the agenda phase.
    let statusDone = false;
    const finishStatus = () => {
      if (!statusDone) clearBoard(everyone);
      statusDone = true;
    };
    const cards = cardRound(round, game.playerCount, { me: state, ...rivals });
    const flow = roundFlow(round);
    /** Warfare's free tactical action is part of its card: it comes right after the card, not where it is stored. */
    const linked = (card: Entry) => round.entries.find(e => e.type === 'tactical' && e.fromCard === card.id);
    /** Replays one entry; true once the replay reached where it was asked to stop. */
    /** Replays one entry, `status` being its card's for Warfare's free action; true once the replay reached where it was asked to stop. */
    const step = (entry: Entry, phase: string, status = entry.status): boolean => {
      const skipped = status === 'cancelled' || (filter === 'now' && status !== 'done');
      if (phase === 'agenda' && (!skipped || entry.id === stopBefore)) finishStatus();
      if (entry.id === stopBefore) return true;
      if (skipped) return false;
      const rival = entry.owner ? rivals[entry.owner] : undefined;
      const view = rival && entry.owner ? views.get(entry.owner)! : game;
      const own = rival ?? state;
      // The ships of everyone else as the replay has them now end the routes of this entry's owner (58.3.2).
      const blockers = entry.type === 'tactical' ? blockersOf(game, state, rival ? entry.owner : undefined, pack) : undefined;
      // A card with Warfare's free action plays it before the acts of its turn.
      const free = entry.type === 'strategic' ? linked(entry) : undefined;
      warningsByEntry[entry.id] = applyEntry(view, own, entry, pack, acts, cards, flow, blockers, free === undefined);
      if (rival && entry.owner && entry.type === 'tactical') rivalLandings(state, entry, entry.owner, pack);
      if (entry.type === 'statusTokens') finishStatus();
      if (free !== undefined) {
        if (step(free, phase, status)) return true;
        const late: Warning[] = [];
        applyActs(view, own, entry, pack, acts, late);
        warningsByEntry[entry.id] = [...warningsByEntry[entry.id], ...placeIn(late, entry.id)];
      }
      return entry.id === stopAfter;
    };
    for (const phase of PHASE_ORDER) {
      for (const entry of round.entries) {
        if (entry.phase !== phase || (entry.type === 'tactical' && entry.fromCard && round.entries.some(e => e.id === entry.fromCard))) continue;
        if (step(entry, phase)) return { state, warningsByEntry };
      }
    }
  }
  return { state, warningsByEntry };
}

export const project = (game: Game, plan: Plan, filter: 'now' | 'forecast', pack: DataPack): Projection =>
  replay(game, plan, filter, pack);

/** The forecast right after an entry, without what comes later: the map between the repeats of its flight. */
export const stateAfterEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack): GameState => {
  const { state } = replay(game, plan, 'forecast', pack, undefined, entryId);
  const owner = plan.rounds.flatMap(r => r.entries).find(e => e.id === entryId)?.owner;
  return (owner && state.rivals?.[owner]) || state;
};

/** The systems that end a route of an entry's owner just before it: the ships of everyone else as the forecast has them. */
export const blockersBefore = (game: Game, plan: Plan, entryId: string, pack: DataPack): Set<string> => {
  const { state } = replay(game, plan, 'forecast', pack, entryId);
  const owner = plan.rounds.flatMap(r => r.entries).find(e => e.id === entryId)?.owner;
  return blockersOf(game, state, owner && state.rivals?.[owner] ? owner : undefined, pack);
};

/**
 * The systems a ship can still go to from the end of a path (see src/domain/movement.ts). Without `blockers`, the other
 * players' ships stand as at the end of the forecast of the active plan, as I see it.
 */
export function routeReach(game: Game, path: string[], speed: number, active: string, pack: DataPack, blockers?: Blockers): Set<string> {
  const plan = game.plans?.find(p => p.id === game.activePlanId);
  return reachOf(game, path, speed, active, pack, blockers ?? blockersOf(game, plan ? project(game, plan, 'forecast', pack).state : null, undefined, pack));
}

/** The state just before an entry applies: by default the forecast, what that entry can move and pay with. */
export const stateBeforeEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack, filter: 'now' | 'forecast' = 'forecast'): GameState => {
  const { state } = replay(game, plan, filter, pack, entryId);
  const owner = plan.rounds.flatMap(r => r.entries).find(e => e.id === entryId)?.owner;
  return (owner && state.rivals?.[owner]) || state;
};

/** The whole board just before an entry, mine and every opponent's (`rivals`), whoever the entry belongs to. */
export const boardBeforeEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack, filter: 'now' | 'forecast' = 'forecast'): GameState =>
  replay(game, plan, filter, pack, entryId).state;
