import type { Board, CardHold, ComponentId, PlayerId } from '../types';

/** A board with cards added to a player's hands: for tests of what a component does when held. */
export const holdings = (board: Board, player: PlayerId, cards: Record<ComponentId, CardHold>): Board =>
  ({ ...board, players: { ...board.players, [player]: { ...board.players[player], cards: { ...board.players[player].cards, ...cards } } } });
