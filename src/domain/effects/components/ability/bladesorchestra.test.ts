import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './bladesorchestra';

describe('ability:bladesorchestra The Blade\'s Orchestra', () => {
  // "When this faction comes into play: flip your home system, double-sided faction components, and all of your
  //  in-play plot cards."
  // Checks: the ability is a reminder of the component action that brings the Obsidian into play, and lifts no check.
  // Why nothing is validated: the faction and its home system are fixed for the whole plan, and plot cards are not
  // tracked, so the flip has nothing to change in the count.
  test('ability:bladesorchestra is a reminder of the component action and waives nothing', () => {
    const { pack } = bench({ faction: 'obsidian', expansions: ['pok', 'te'] });
    quote(pack, id, 'Then, ready Cronos Hollow and Tallin Hollow if you control them.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  test.todo('ability:bladesorchestra the home system flips and its planets are readied: the faction of a game cannot change mid-plan');
});
