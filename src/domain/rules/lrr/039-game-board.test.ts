/** LRR 39 Game Board. Source: tirules2 rules-reference/game-board.md. */
import { describe, expect, test } from 'vitest';
import { isOnMap, systemSlots } from '../../../testing/old/domain/project';
import { rulesGame, ROW } from '../kit';

describe('LRR 39 Game Board', () => {
  test('39.1: the board is every system tile placed, including one that touches no other tile', () => {
    const lone = '7,-7';
    const game = rulesGame({ map: { ...rulesGame().map, [lone]: 'r-empty' } });
    expect(systemSlots(game).sort()).toEqual([...ROW, lone].sort());
    expect(isOnMap(game, lone)).toBe(true);
  });

  test.todo('39.2: a tile with a side touching no other tile is on the edge of the board — not modelled: the edge of the board is never used');
  test.todo('39.2.1: the Creuss home system and the wormhole nexus are on the edge — not modelled: the edge of the board is never used');
  test.todo('39 note 1: a side touching a hyperlane does not put a tile on the edge — not modelled: the edge of the board is never used');
  test.todo('39 note 1.1: in the five- and seven-player hyperlane setups the tile ringed by hyperlanes is not on the edge — not modelled: the edge of the board is never used');
  test.todo('39 note 1.2: in the seven- and eight-player alternate setups only ring 3, homes, Creuss and the nexus are on the edge — not modelled: the edge of the board is never used');
});
