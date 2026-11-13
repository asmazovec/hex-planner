/** A bare three-player table for tests that need a board and no data pack. */
import { emptyBoard } from './board';
import type { Board, Table } from './types';

export const bareTable = (count = 3): Table => ({
  id: 'g', name: 'test', expansions: ['pok'], layout: 'standard', map: {},
  players: Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, faction: '', seat: i + 1, color: i + 1, setup: {} })),
  viewer: 'p1',
});

export const bareBoard = (count = 3): Board => emptyBoard(bareTable(count));
