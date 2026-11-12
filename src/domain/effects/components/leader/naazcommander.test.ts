import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './naazcommander';

describe('leader:naazcommander Dart and Tai', () => {
  // "After you gain control of a planet that was controlled by another player: You may explore that planet."
  // Checks: the commander is a reminder with no step and lifts nothing.
  // Why nothing is validated here: exploration is not planned; the capture of the planet is counted by the invasion,
  // and the exploration it allows has nothing to be counted at.
  test('leader:naazcommander is a hint with no step: exploration is not planned', () => {
    const { pack } = bench({ faction: 'naaz', expansions: ['pok'] });
    quote(pack, id, 'You may explore that planet.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
