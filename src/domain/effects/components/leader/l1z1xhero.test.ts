import { describe, expect, test } from 'vitest';
import type { Entry, Game } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, FAR, HOME, NEAR, quote, warningsOf } from '../kit';
import systemOccupied from '../../../rules/codes/systemOccupied';
import { id } from './l1z1xhero';

/** The check of the hero's play (src/domain/rules/codes/systemOccupied.ts): the chosen system holds other players' ships. */
const OCCUPIED = systemOccupied.code;

/** The hero's action: FAR is chosen, and the ships named by `<unit>@<slot>` go there. */
const helmsman = (choices: Record<string, string | number> = { system: FAR, [`dreadnought@${HOME}`]: 2, [`flagship@${NEAR}`]: 1 }) =>
  componentAction(id, { choices } as Partial<Entry>);

const table = (entries: Entry[], game: Partial<Game> = {}) => bench({
  faction: 'l1z1x', expansions: ['pok'], entries, game, start: { leaders: { [id]: 'unlocked' } },
  units: { [HOME]: { dreadnought: 2, carrier: 1 }, [NEAR]: { flagship: 1 } },
});

describe('leader:l1z1xhero The Helmsman', () => {
  // "ACTION: Choose 1 system that does not contain other players' ships. you may move your flagship and any number of
  //  your dreadnoughts from other systems into the chosen system."
  // Checks: the two dreadnoughts of the home system and the flagship of NEAR are in FAR after the action, three and
  // two systems away.
  // Why nothing is waived: it is not a tactical action; faction note 3: "Ships move directly to their destination
  // system", so no route and no move value are checked.
  test('leader:l1z1xhero moves the flagship and the dreadnoughts chosen into the chosen system', () => {
    const hero = helmsman();
    const l1z1x = table([hero]);
    quote(l1z1x.pack, id, 'you may move your flagship and any number of your dreadnoughts from other systems into the chosen system');
    const end = endOf(l1z1x);
    expect(end.systems[FAR]).toEqual({ dreadnought: 2, flagship: 1 });
    expect(end.systems[HOME]).toEqual({ carrier: 1 });
    expectNone(warningsOf(l1z1x, hero), 'speedShort');
  });

  // Checks: a carrier named with the dreadnoughts stays where it is.
  // Why the check is NOT redundant here: the text moves the flagship and dreadnoughts only.
  test('leader:l1z1xhero moves no other ship', () => {
    const l1z1x = table([helmsman({ system: FAR, [`dreadnought@${HOME}`]: 1, [`carrier@${HOME}`]: 1 })]);
    const end = endOf(l1z1x);
    expect(end.systems[FAR]).toEqual({ dreadnought: 1 });
    expect(end.systems[HOME]).toEqual({ dreadnought: 1, carrier: 1 });
  });

  // "Choose 1 system that does not contain other players' ships."
  // Checks: a chosen system holding a rival's cruiser is warned of; the ships still move, as a warning forbids nothing.
  // Why the check is NOT redundant here: the hero's own condition.
  test('leader:l1z1xhero choosing a system with other players\' ships is warned of', () => {
    const hero = helmsman();
    const l1z1x = table([hero], { opponents: [{ id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 }], enemyUnits: { [FAR]: { o1: { cruiser: 1 } } } });
    expectStanding(warningsOf(l1z1x, hero), OCCUPIED);
    expect(endOf(l1z1x).systems[FAR]).toMatchObject({ dreadnought: 2 });
  });

  // "Then, purge this card." LRR 51.12: a hero is purged once its ability is resolved.
  // Checks: a second play finds the hero gone.
  test('leader:l1z1xhero is purged by its play', () => {
    const again = helmsman();
    expectStanding(warningsOf(table([helmsman(), again]), again), 'componentNotHeld');
  });

  test.todo('leader:l1z1xhero ships moved may transport units from a system without a command token, and not into a nebula or supernova (faction notes 2 and 5): the play takes ships only');

  test('leader:l1z1xhero is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).nativePlay).toBeDefined();
  });
});
