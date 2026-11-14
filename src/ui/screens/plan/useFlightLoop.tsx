import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { timelineOf } from '../../../state/projection';
import { findTurn } from '../../../game/edit/plan';
import type { Round } from '../../../game/round';
import type { Turn } from '../../../game/actions';
import { playerOfKey } from '../../../game/keys';
import type { SavedGame } from '../../../game/save';
import type { TacticalEntry } from '../../../domain/tactical';
import { atOf, tacticalSystems } from '../../../game/edit/tacticalRead';
import type { DataPack, Entry } from '../../../domain/types';
import { activatedBoard, flies, inFlight as boardInFlight } from '../../../game/flight';
import { mapSource } from '../../../game/space';
import type { Board } from '../../../game/types';
import { useGame } from '../../../state/gameStore';
import { playsFlights } from '../../common/motion';
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
 * the way; `filter` is the replay its map stands on. A flight goes through three phases: the units stand where they are
 * until `departed`, then fly, and once `landed` the ships fade out over the map that shows them landed.
 */
interface Flight { entryId: string; run: number; saved: SavedGame; passed: number[]; filter: Filter; /** A flight after another of the same reading: only then is the step back seen. */ repeat: boolean; departed?: boolean; landed?: boolean }

/** The turn of an entry as the plan holds it: what the flight reads its moves from. */
const turnOfEntry = (rounds: Round[], entry: Entry): Turn => findTurn(rounds, entry.id)!.turn;

/** The pause before a shown action first flies, and between its flights. */
const LOOP_START_MS = 380;
const LOOP_PAUSE_MS = 750;
/** How long the units stand in their systems, as before the action, before they leave: the step back plays out first. */
const DEPART_HOLD_MS = 600;
/** The same before the first flight of a reading: nothing steps back, the map only has to stand a moment. */
const FIRST_HOLD_MS = 120;

export interface FlightLoopInput {
  saved: SavedGame | null;
  planId: string | undefined;
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
export function useFlightLoop({ saved, planId, pack, boards, shown, shownEntry, onPlayed }: FlightLoopInput) {
  const [flight, setFlight] = useState<Flight | null>(null);
  const runs = useRef(0);
  // A change of the game, undo for one, ends the flight.
  useEffect(() => useGame.subscribe((state, previous) => {
    if (state.saved !== previous.saved) setFlight(f => (f && f.saved !== state.saved ? null : f));
  }), []);
  const flying = flight?.saved === saved ? flight : null;

  // Nothing to show in a flight, nothing to repeat: an action with no units in its moves, for one.
  const loops = shownEntry?.type === 'tactical' && playsFlights() && saved !== null && planId !== undefined
    && flies(turnOfEntry(timelineOf(saved, planId, 'forecast', pack).rounds, shownEntry));

  const start = useCallback((entryId: string, filter: Filter = 'forecast', repeat = false) => {
    const current = useGame.getState().saved;
    if (!playsFlights() || !current) return;
    runs.current += 1;
    setFlight({ entryId, run: runs.current, saved: current, passed: [], filter, repeat });
  }, []);
  const stop = useCallback(() => setFlight(null), []);

  // Between the repeats the map stands right after the action: one replay for the whole reading, not one per drawing.
  const airborne = flying !== null && !flying.landed;
  /** The map has stepped back to before the action and the units wait to leave. */
  const waiting = airborne && !flying.departed;
  const restingEntry = !airborne && shown && shownEntry && loops && shown.plays > 0 && flightLoop.read() ? shownEntry : undefined;
  const restingId = restingEntry?.id;
  const restingBoard = useMemo(() => {
    if (!restingId || !saved || !planId) return null;
    const kernel = timelineOf(saved, planId, 'forecast', pack);
    return kernel.byTurn.get(restingId)?.after ?? kernel.end;
  }, [restingId, saved, planId, pack]);

  useEffect(() => {
    if (!shown || !loops || flying) return undefined;
    // With the loop turned off the details play the flight once.
    if (shown.plays > 0 && !flightLoop.read()) return undefined;
    const timer = setTimeout(() => {
      onPlayed();
      start(shown.id, 'forecast', shown.plays > 0);
    }, shown.plays === 0 ? LOOP_START_MS : LOOP_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [shown, loops, flying, start, onPlayed]);

  /**
   * The map while the action flies, and between its repeats: then it stays right after the action, for what comes later
   * in the plan would blink in and out on every round. `shownState` is what the map shows otherwise; the arrows give the
   * flight its lines.
   */
  const scene = (tacticals: TacticalEntry[], shownBoard: Board, arrows: Arrow[]): { mapBoard: Board; layer: ReactNode } => {
    const flyingEntry = flying ? tacticals.find(item => item.id === flying.entryId) : undefined;
    if (!saved || !planId) return { mapBoard: shownBoard, layer: null };
    const beforeFlight = flying && flyingEntry ? boards.boardOf(flyingEntry.id, flying.filter) : null;
    const { table, rounds } = timelineOf(saved, planId, flying?.filter ?? 'forecast', pack);
    const inFlight = airborne && flyingEntry && beforeFlight
      ? (waiting ? activatedBoard(beforeFlight, turnOfEntry(rounds, flyingEntry)) : boardInFlight(beforeFlight, turnOfEntry(rounds, flyingEntry), flying.passed))
      : null;
    const mapBoard = inFlight ?? restingBoard ?? shownBoard;
    const layer = flying && flyingEntry && beforeFlight && (
      <FlightLayer
        key={flying.run} colour={playerColour(table.players.find(p => p.id === (playerOfKey(table, flyingEntry?.owner ?? 'me') ?? table.viewer))?.color ?? 1)} passed={flying.passed}
        routes={flightRoutes({ map: mapSource(table, shownBoard), pack }, turnOfEntry(rounds, flyingEntry), from => arrows.find(a => a.key === `${flyingEntry.id}:${from}`)?.shape)}
        onPass={move => setFlight(f => f && { ...f, passed: [...f.passed, move] })}
        holdMs={flying.repeat ? DEPART_HOLD_MS : FIRST_HOLD_MS}
        onDepart={() => setFlight(f => f && { ...f, departed: true })}
        onArrive={() => setFlight(f => f && { ...f, landed: true })}
        onDone={stop}
      />
    );
    return { mapBoard, layer };
  };

  /**
   * Stepping back, leaving, pickups and landing move in the systems of the action only (`animated`, drawn in a layer of
   * their own); every other tile changes at once, the whole map too while the units wait to leave.
   */
  const still = waiting;
  /** Before the first flight of a reading nothing has flown: its systems step back at once too, with no motion to see. */
  const quiet = waiting && !flying.repeat;
  /** On landing only the systems of the action move: its active system and those its ships and cargo left. */
  const loopingEntry = shown && loops && shownEntry && saved ? shownEntry : undefined;
  const animated = useMemo(
    () => {
      if (!loopingEntry || !saved || !planId) return null;
      const kernel = timelineOf(saved, planId, 'forecast', pack);
      return new Set(tacticalSystems(atOf(kernel.table, kernel.end, pack), turnOfEntry(kernel.rounds, loopingEntry)));
    },
    [loopingEntry, saved, planId, pack],
  );

  return { flying, loops, still, quiet, animated, start, stop, scene };
}
