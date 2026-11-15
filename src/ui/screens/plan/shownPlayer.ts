/**
 * The shown player of the «План и карта» screen: the one player everything on it that is someone's follows (the totals,
 * the first level of the list, the new action, the strategy cards, the components, the big hex, the accent colour).
 * It is the state of the screen, not of the game: nothing of it is saved, the mark of who sits at the tablet stays where
 * it is, and when a game opens (another one, or the same one again) the shown player is the one at the tablet.
 */
import { create } from 'zustand';
import type { PlayerId, Table } from '../../../game/types';
import { useGame } from '../../../state/gameStore';

interface ShownPlayer {
  /** The player chosen by the switch; null until one is: the player at the tablet is shown. */
  chosen: PlayerId | null;
  show: (player: PlayerId) => void;
}

const useChosen = create<ShownPlayer>(set => ({ chosen: null, show: chosen => set({ chosen }) }));

// A game that opens, or closes, starts from the player at the tablet.
let openId = useGame.getState().saved?.id ?? null;
useGame.subscribe(state => {
  const id = state.saved?.id ?? null;
  if (id === openId) return;
  openId = id;
  if (useChosen.getState().chosen !== null) useChosen.setState({ chosen: null });
});

/** The chosen player while they sit at this table; the player at the tablet otherwise. */
const shownAt = (table: Table, chosen: PlayerId | null): PlayerId =>
  (chosen !== null && table.players.some(p => p.id === chosen && p.seat < 100) ? chosen : table.viewer);

/** The shown player of a table, outside a render. */
export const shownPlayerNow = (table: Table): PlayerId => shownAt(table, useChosen.getState().chosen);

/** The shown player of a table and the switch that changes it; no player while there is no table. */
export function useShownPlayer(table: Table | undefined): { shown: PlayerId | undefined; show: (player: PlayerId) => void } {
  const chosen = useChosen(state => state.chosen);
  const show = useChosen(state => state.show);
  return { shown: table ? shownAt(table, chosen) : undefined, show };
}
