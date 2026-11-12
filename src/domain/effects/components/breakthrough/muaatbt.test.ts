import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './muaatbt';

describe('breakthrough:muaatbt Stellar Genesis', () => {
  // "When you gain this card, place the Avernus planet token into a non-home system that is adjacent to a planet you
  //  control; gain the Avernus planet card and ready it."
  // Checks: an entry that gains the breakthrough leaves the Muaat controlling Avernus, ready.
  // Why the check is redundant here: a planet is otherwise gained by landing on it (25.1); the card gives it outright.
  test.fails('breakthrough:muaatbt gained gives the Avernus planet card, ready', () => {
    const gain = { ...adjust({}), gains: [id] };
    const muaat = bench({ faction: 'muaat', expansions: ['pok', 'te'], entries: [gain] });
    quote(muaat.pack, id, 'gain the Avernus planet card and ready it');
    const end = endOf(muaat);
    expect(end.control.avernus).toBe('me');
    expect(end.exhausted ?? []).not.toContain('avernus');
  });

  test.todo('breakthrough:muaatbt the Avernus token is placed in a non-home system next to a planet I control: the replay puts no planet into a system');
  test.todo('breakthrough:muaatbt the Avernus token moves with a war sun out of or through its system: the replay puts no planet into a system');

  test.fails('breakthrough:muaatbt is a play effect', () => {
    expect(effect(bench({ faction: 'muaat', expansions: ['te'] }).pack, id).tier).toBe('play');
  });
});
