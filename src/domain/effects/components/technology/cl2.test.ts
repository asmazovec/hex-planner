import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, endOf, FAR, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './cl2';

/** A carrier with two infantry takes the target; one infantry dies there in the ground combat. Then my next turn. */
const invade = () => tactical(TARGET, {
  moves: [{ from: HOME, units: { carrier: 1, infantry: 2 }, via: [NEAR] }],
  landings: [{ planetId: 't1', units: { infantry: 2 } }], groundLosses: { t1: { infantry: 1 } },
});
const table = (entries: Entry[], technologies = [id]) => bench({
  faction: 'mahact', expansions: ['pok'], units: { [HOME]: { carrier: 1, infantry: 2 } }, start: { technologies }, entries,
  game: { planetControl: { h1: 'me', h2: 'me' } },
});
const homeInfantry = (entries: Entry[], technologies?: string[]) => {
  const end = endOf(table(entries, technologies));
  return (end.ground.h1?.infantry ?? 0) + (end.ground.h2?.infantry ?? 0);
};

describe('technology:cl2 Crimson Legionnaire II', () => {
  // "After this unit is destroyed, ... place the unit on this card. At the start of your next turn, place each unit
  //  that is on this card on a planet you control in your home system."
  // Checks: the infantry destroyed on the target comes back on a home planet at the start of my next turn.
  // Why the default count does not apply: a destroyed unit returns to the reinforcements (LRR 33); this one comes
  // back to the board.
  test('technology:cl2 an infantry destroyed comes back to the home system at my next turn', () => {
    const { pack } = table([]);
    quote(pack, id, 'At the start of your next turn, place each unit that is on this card on a planet you control in your home system.');
    expect(homeInfantry([invade(), tactical(FAR)])).toBe(1);
  });

  // "At the start of your next turn ..."
  // Checks: without a next turn of mine the infantry is not back yet.
  // Why the default count stands here: the unit waits on the card until that turn.
  test('technology:cl2 the infantry is not back before my next turn', () => {
    expect(homeInfantry([invade()])).toBe(0);
  });

  // LRR 33: a destroyed unit goes back to the reinforcements.
  // Checks: with the common infantry the destroyed one does not come back.
  // Why the default count stands here: the ability is printed on the Mahact infantry upgrade only.
  test('technology:cl2 not held, a destroyed infantry stays gone', () => {
    expect(homeInfantry([invade(), tactical(FAR)], [])).toBe(0);
  });

  test('technology:cl2 is a passive unit upgrade', () => {
    const { pack } = table([]);
    quote(pack, id, 'Cost 1(x2), Combat 7');
    expect(effect(pack, id).tier).toBe('passive');
  });

  test.todo('technology:cl2 gain 1 commodity or convert 1 to a trade good for each one destroyed: the player\'s choice, not counted');
});
