import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './puppetsoftheblade';

const firmament = () => bench({ faction: 'firmament', expansions: ['pok', 'te'] });

describe('ability:puppetsoftheblade Puppets of the Blade', () => {
  // "ACTION: Purge The Firmament's faction sheet, leaders, planet cards, and promissory note. Then, gain all of the
  //  faction components for The Obsidian."
  // Checks: the ability is a reminder of the component action and lifts no check.
  // Why nothing is validated: its condition is a plot card, which is not tracked, and its effect turns the faction
  // of the game into another one, which the plan cannot do after the start (the faction and its home are fixed).
  test('ability:puppetsoftheblade is a reminder of the component action and waives nothing', () => {
    const { pack } = firmament();
    quote(pack, id, 'Then, gain all of the faction components for The Obsidian.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('ability:puppetsoftheblade the Firmament becomes the Obsidian: the faction of a game cannot change mid-plan, and plot cards are not tracked');
});
