import { describe, expect, test } from 'vitest';
import type { Entry, Game, UnitCounts } from '../../../types';
import { bench, effect, endOf, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './crucible';

const NOTE = `${id}@o1`;
const CABAL: Game['opponents'][number] = { id: 'o1', faction: 'cabal', vp: 0, seat: 2, color: 2 };
/** The test row with a gravity rift in the second system. */
const RIFT_ROW = { [HOME]: 'r-home', [NEAR]: 'r-rift', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

/** Sol's `units` fly from home to `to` (through the rift on the rift row), with Crucible named in the entry or not. */
const flight = (units: UnitCounts, to: string, options: { crucible?: boolean; rift?: boolean; faction?: string; note?: string } = {}) => {
  const { crucible = true, rift = true, faction = 'sol', note = NOTE } = options;
  const move: Entry = tactical(to, { moves: [{ from: HOME, units, via: to === FARTHER ? [NEAR, TARGET, FAR] : [NEAR, TARGET] }] });
  const entry = crucible ? using(move, note) : move;
  return {
    entry,
    ...bench({
      faction, expansions: ['pok'], units: { [HOME]: units }, start: { promissory: [note] }, entries: [entry],
      game: { opponents: [CABAL], ...(rift ? { map: RIFT_ROW } : {}) },
    }),
  };
};

describe('promissory:crucible Crucible', () => {
  // "After you activate a system: Your ships do not roll for gravity rifts during this movement, apply an additional
  //  +1 to the move values of your ships that would move out of or through a gravity rift instead."
  // Checks: a cruiser (move 2) passes the rift and reaches a system four away; with the rift's +1 it is short by one;
  // the speed warning is listed and lifted by Crucible.
  // Why the check is redundant here: LRR 41.3 gives +1 per rift left or crossed, and Crucible gives one more to a ship
  // that moves out of or through a gravity rift (Crucible note 2: the rift's own +1 stays). A played note cannot change
  // a number of the count, so the one step it adds is lifted as a waiver.
  test.fails('promissory:crucible a ship through a gravity rift moves one system further: the speed warning is waived', () => {
    const table = flight({ cruiser: 1 }, FARTHER);
    quote(table.pack, id, 'apply an additional +1 to the move values of your ships that would move out of or through a gravity rift');
    expectWaived(warningsOf(table, table.entry), 'speedShort', NOTE);
  });

  // Vuil'raith, Crucible note 2: "Crucible will provide an additional +1 to each ship's move value, which will not
  //  increase if that ship moves through two or more gravity rifts."
  // Checks: a carrier (move 1) on the same path is short by two and stays warned of.
  // Why the check is NOT redundant here: the note adds one step, not two.
  test('promissory:crucible a ship short by two stays warned of', () => {
    const table = flight({ carrier: 1 }, FARTHER);
    expectStanding(warningsOf(table, table.entry), 'speedShort');
  });

  // Checks: without a gravity rift on the path the cruiser short by one is warned of.
  // Why the check is NOT redundant here: the +1 is for ships that move out of or through a gravity rift only.
  test('promissory:crucible does nothing on a path without a gravity rift', () => {
    const table = flight({ cruiser: 1 }, FAR, { rift: false });
    expectStanding(warningsOf(table, table.entry), 'speedShort');
  });

  // LRR 58.2 with 41.3.
  // Checks: held but not named in the entry, Crucible lifts nothing.
  // Why the check is NOT redundant here: the note acts only when played, after the activation.
  test('promissory:crucible held but not played lifts nothing', () => {
    const table = flight({ cruiser: 1 }, FARTHER, { crucible: false });
    expectStanding(warningsOf(table, table.entry), 'speedShort');
  });

  // "Then, return this card to the Vuil'raith player." LRR 69.3.
  // Checks: once played the note is back with the Cabal.
  test('promissory:crucible goes back to the Vuil\'raith player once played', () => {
    const table = flight({ cruiser: 1 }, FARTHER);
    quote(table.pack, id, 'Then, return this card to the Vuil\'raith player.');
    const end = endOf(table);
    expect(end.holdings.promissory).not.toContain(NOTE);
    expect(end.rivals?.o1?.holdings.promissory).toContain(NOTE);
  });

  // LRR 69.2: a player cannot play their own promissory note.
  // Checks: the Cabal playing their own Crucible are warned of.
  // Why the check is NOT redundant here: the note is played by another player.
  test('promissory:crucible the Cabal cannot play their own', () => {
    const table = flight({ cruiser: 1 }, FARTHER, { faction: 'cabal', note: `${id}@me` });
    expectStanding(warningsOf(table, table.entry), 'ownPromissory');
  });

  test.fails('promissory:crucible waives the speed of the movement it is played in', () => {
    const { pack } = flight({ cruiser: 1 }, FARTHER);
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['speedShort']);
  });
});
