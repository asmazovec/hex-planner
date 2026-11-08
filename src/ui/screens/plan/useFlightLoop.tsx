import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { stateAfterEntry } from '../../../domain/project';
import { gameAs } from '../../../domain/players';
import { flies, stateInFlight, type TacticalEntry } from '../../../domain/tactical';
import type { DataPack, Entry, Game, GameState, Plan } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { reducedMotion } from '../../common/motion';
import { flightLoop } from '../../common/preferences';
import { FlightLayer } from '../../map/FlightLayer';
import type { Arrow } from '../../map/RouteArrows';
import { flightRoutes } from '../../plan/tactical';
import { playerColour } from '../../units/sprites';
import type { Boards } from './useBoards';
import type { Shown } from './pick';

type Filter = 'now' | 'forecast';

/**
 * A flight under way: it ends when the game it started from changes. `passed` holds the moves already taken on board on
 * the way; `filter` is the replay its map stands on.
 */
interface Flight { entryId: string; run: number; game: Game; passed: number[]; filter: Filter }

/** The pause before a shown action first flies, and between its flights. */
const LOOP_START_MS = 380;
const LOOP_PAUSE_MS = 750;

export interface FlightLoopInput {
  game: Game | null;
  plan: Plan | undefined;
  pack: DataPack;
  boards: Boards;
  /** The entry being read, and how many of its flights have started. */
  shown: Shown | null;
  shownEntry: Entry | undefined;
  /** One more flight of the entry being read has started. */
  onPlayed: () => void;
}

/**
 * The flight of a tactical action and its repeats while the action is read: a flight starts by hand (`start`) or by
 * itself between the repeats, and `scene` gives the map under it and the layer that draws it.
 */
export function useFlightLoop({ game, plan, pack, boards, shown, shownEntry, onPlayed }: FlightLoopInput) {
  const [flight, setFlight] = useState<Flight | null>(null);
  const runs = useRef(0);
  // A change of the game, undo for one, ends the flight.
  useEffect(() => useGame.subscribe((state, previous) => {
    if (state.game !== previous.game) setFlight(f => (f && f.game !== state.game ? null : f));
  }), []);
  const flying = flight?.game === game ? flight : null;

  // Nothing to show in a flight, nothing to repeat: a move whose units are not at the source, for one.
  const loops = shownEntry?.type === 'tactical' && !reducedMotion() && game !== null && plan !== undefined && flies(pack, shownEntry, boards.before(shownEntry.id));

  const start = useCallback((entryId: string, filter: Filter = 'forecast') => {
    const current = useGame.getState().game;
    if (reducedMotion() || !current) return;
    runs.current += 1;
    setFlight({ entryId, run: runs.current, game: current, passed: [], filter });
  }, []);
  const stop = useCallback(() => setFlight(null), []);

  useEffect(() => {
    if (!shown || !loops || flying) return undefined;
    // With the loop turned off the details play the flight once.
    if (shown.plays > 0 && !flightLoop.read()) return undefined;
    const timer = setTimeout(() => {
      onPlayed();
      start(shown.id);
    }, shown.plays === 0 ? LOOP_START_MS : LOOP_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [shown, loops, flying, start, onPlayed]);

  /**
   * The map while the action flies, and between its repeats: then it stays right after the action, for what comes later
   * in the plan would blink in and out on every round. `shownState` is what the map shows otherwise; the arrows give the
   * flight its lines.
   */
  const scene = (tacticals: TacticalEntry[], shownState: GameState, arrows: Arrow[]): { mapState: GameState; layer: ReactNode } => {
    const flyingEntry = flying ? tacticals.find(item => item.id === flying.entryId) : undefined;
    if (!game || !plan) return { mapState: shownState, layer: null };
    const beforeFlight = flying && flyingEntry ? boards.before(flyingEntry.id, flying.filter) : null;
    const inFlight = flying && flyingEntry && beforeFlight ? stateInFlight(pack, flyingEntry, beforeFlight, flying.passed) : null;
    const resting = !flying && shown && shownEntry && loops && shown.plays > 0 && flightLoop.read() ? shownEntry : undefined;
    const held = inFlight ?? (resting ? stateAfterEntry(game, plan, resting.id, pack) : null);
    const owner = (flyingEntry ?? resting)?.owner;
    const mapState = !held ? shownState : owner ? { ...shownState, rivals: { ...shownState.rivals, [owner]: held } } : held;
    const flyingGame = gameAs(game, flyingEntry?.owner);
    const layer = flying && flyingEntry && beforeFlight && (
      <FlightLayer
        key={flying.run} colour={playerColour(flyingGame.color)} passed={flying.passed}
        routes={flightRoutes(flyingGame, pack, flyingEntry, beforeFlight, from => arrows.find(a => a.key === `${flyingEntry.id}:${from}`)?.shape)}
        onPass={move => setFlight(f => f && { ...f, passed: [...f.passed, move] })}
        onDone={stop}
      />
    );
    return { mapState, layer };
  };

  return { flying, loops, start, stop, scene };
}
