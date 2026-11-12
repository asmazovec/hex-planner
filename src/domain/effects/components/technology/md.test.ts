import { describe, expect, test } from 'vitest';
import { bench, effect, endOf, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './md';

/** I activate `system`; a space dock and a PDS of mine stand on h1, a PDS on h2. */
const activate = (system: string, technologies: string[] = [id]) => {
  const entry = tactical(system, {});
  return { entry, ...bench({ faction: 'hacan', expansions: ['pok'], start: { technologies }, entries: [entry], game: { docks: ['h1'], pds: { h1: 1, h2: 1 } } }) };
};

const infantryOn = (table: ReturnType<typeof activate>, planetId: string): number => endOf(table).ground[planetId]?.infantry ?? 0;

describe('technology:md Magen Defense Grid ΩΩ', () => {
  // "When any player activates a system that contains 1 or more of your structures, place 1 infantry from your
  //  reinforcements with each of those structures."
  // Checks: I activate my home system, where a space dock and a PDS stand on h1 and a PDS on h2: two infantry are
  // placed on h1 and one on h2.
  // Why the default does not apply: without the card nothing is placed on activation (LRR 5 activates, it builds
  // nothing); the card adds units to the board, one with each structure.
  test.fails('technology:md activating a system with my structures places one infantry with each of them', () => {
    const table = activate(HOME);
    quote(table.pack, id, 'place 1 infantry from your reinforcements with each of those structures');
    expect(infantryOn(table, 'h1')).toBe(2);
    expect(infantryOn(table, 'h2')).toBe(1);
  });

  // LRR 5.1: activating a system places a command token in it; nothing else happens to the units there.
  // Checks: the same activation without the technology places nothing.
  // Why nothing is placed here: no component of this player speaks of the activation.
  test('technology:md not held, the activation places no infantry', () => {
    const table = activate(HOME, []);
    expect(infantryOn(table, 'h1')).toBe(0);
    expect(infantryOn(table, 'h2')).toBe(0);
  });

  // "... activates a system that contains 1 or more of your structures"
  // Checks: activating a system without my structures places nothing anywhere.
  // Why nothing is placed here: the card's condition is a structure of mine in the activated system.
  test('technology:md activating a system without my structures places nothing', () => {
    const table = activate(NEAR);
    expect(infantryOn(table, 'h1')).toBe(0);
    expect(infantryOn(table, 'h2')).toBe(0);
  });

  test.todo('technology:md "When any player activates": an opponent\'s entry activating a system with my structures; the replay asks the effects of the owner of the entry only');

  // "At the start of ground combat on a planet that contains 1 or more of your structures, produce 1 hit"
  test.todo('technology:md the hit at the start of ground combat is a reminder of the invasion: a passive effect cannot carry `hintAt`, and the plan does not fight the combat');

  // Checks: the effect that places the infantry applies by itself while the card is held (no exhaust, no choice).
  test.fails('technology:md is a passive effect', () => {
    const { pack } = activate(HOME);
    expect(effect(pack, id).tier).toBe('passive');
  });
});
