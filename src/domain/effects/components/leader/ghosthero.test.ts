import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectStanding, quote, warningsOf } from '../kit';
import { id } from './ghosthero';

describe('leader:ghosthero Riftwalker Meian — Singularity Reactor', () => {
  // "ACTION: Swap the positions of any 2 non-Fracture systems that contain wormholes or your units, other than the
  //  Creuss system, Ahk Creuxx system, or the Wormhole Nexus."
  // Checks: the hero is a reminder in the block of the component action.
  // Why nothing is validated: the swap changes the map, and the replay keeps the map of the game fixed (the map is
  // the game's setup, not part of the replayed state); the units would move with their systems (Creuss notes,
  // Riftwalker Meian 1).
  test('leader:ghosthero is a hint of the component action', () => {
    const { pack } = bench({ faction: 'ghost', expansions: ['pok'] });
    quote(pack, id, 'Swap the positions of any 2 non-Fracture systems that contain wormholes or your units');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // LRR 51.12: a hero is purged once its ability is resolved.
  // Checks: a second play of the hero is warned of.
  // Why the check is NOT redundant here: the generic rule of heroes holds whatever the hero does.
  test('leader:ghosthero is purged by its play', () => {
    const again = componentAction(id);
    const table = bench({ faction: 'ghost', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [componentAction(id), again] });
    expectStanding(warningsOf(table, again), 'componentNotHeld');
  });

  test.todo('leader:ghosthero swaps two systems with their units: the map is not part of the replayed state');
});
