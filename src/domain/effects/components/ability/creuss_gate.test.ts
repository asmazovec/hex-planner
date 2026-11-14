import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../../data/loadPack';
import { rulesGame } from '../../../rules/kit';
import { offMapHomes } from '../../../strategy';
import { effect, HOME, NEAR, quote } from '../kit';
import { id } from './creuss_gate';

describe('ability:creuss_gate Creuss Gate', () => {
  // "When you create the game board, place the Creuss Gate (tile 17) where your home system would normally be placed.
  //  The Creuss Gate system is not a home system. Then, place your home system (tile 51) in your play area."
  // Checks: with the gate on the map the Creuss home is a system off the map, as the map builder already sets it.
  // Why nothing is validated: the ability acts when the board is created; the map of the game already holds the gate,
  // and the replay never moves either tile.
  test('ability:creuss_gate with the gate on the map, the Creuss home is off the map', () => {
    const pack = loadPack([]);
    quote(pack, id, 'place the Creuss Gate (tile 17) where your home system would normally be placed');
    const game = rulesGame({ map: { [HOME]: pack.factions.ghost.gateTile!, [NEAR]: 'r-empty' }, game: { faction: 'ghost' } });
    expect(offMapHomes(game, pack)).toEqual([pack.factions.ghost.homeTile]);
  });

  // Checks: the ability is a reminder with no step: it acts before any plan.
  test('ability:creuss_gate is a hint with no waiver', () => {
    const pack = loadPack([]);
    expect(effect(pack, id).tier).toBe('hint');
  });
});
