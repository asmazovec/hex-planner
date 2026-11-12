import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './titansagent';

const titans = (state: 'unlocked' | 'exhausted') => bench({ faction: 'titans', expansions: ['pok'], start: { leaders: { [id]: state } } });

describe('leader:titansagent Tellurian', () => {
  // "Before a hit would be assigned: You may exhaust this card to cancel that hit."
  // Checks: the agent is a reminder of the combat and the invasion, shown there while it is ready.
  // Why nothing is validated here: hits are not rolled by the plan; the player enters the losses that remain.
  test('leader:titansagent is a hint of the combat, shown while the agent is ready', () => {
    const table = titans('unlocked');
    quote(table.pack, id, 'You may exhaust this card to cancel that hit');
    expect(effect(table.pack, id).tier).toBe('hint');
    expect(effect(table.pack, id).hintAt).toEqual(['combat', 'invasion']);
    expect(hintsAt(table.pack, endOf(table), 'combat', ['me']).map(c => c.id)).toContain(id);
  });

  // LRR 34.1: an exhausted card cannot be used again until it is readied.
  // Checks: an exhausted agent is no longer offered as a reminder.
  // Why it is not shown: its ability is spent until the status phase readies it.
  test('leader:titansagent exhausted is not shown in the combat', () => {
    const table = titans('exhausted');
    expect(hintsAt(table.pack, endOf(table), 'combat', ['me']).map(c => c.id)).not.toContain(id);
  });
});
