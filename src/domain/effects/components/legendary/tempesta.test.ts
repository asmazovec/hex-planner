import { describe, expect, test } from 'vitest';
import type { UnitCounts, Warning } from '../../../types';
import { bench, effect, expectStanding, expectWaived, FAR, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './tempesta';

/** A flight of `units` from the home system into `to` through the systems between, the refinery named or not. */
const flight = (units: UnitCounts, { to = TARGET, uses = true, control = true }: { to?: string; uses?: boolean; control?: boolean } = {}) => {
  const via = to === TARGET ? [NEAR] : [NEAR, TARGET];
  const plain = tactical(to, { moves: [{ from: HOME, units, via }] });
  const move = uses ? using(plain, id) : plain;
  return { move, ...bench({ faction: 'letnev', expansions: ['te'], units: { [HOME]: units }, entries: [move], game: { planetControl: control ? { tempesta: 'me' } : {} } }) };
};

/** The components that lift each speed warning of the entry. */
const waivedBy = (warnings: Warning[]) => warnings.filter(w => w.code === 'speedShort').map(w => w.waivedBy ?? []);

describe('legendary:tempesta Ionian Fuel Refinery', () => {
  // "You may exhaust this card after you activate a system to apply +1 to the move value of 1 of your ships during
  //  this tactical action."
  // Checks: one carrier (move 1) flies two systems with the refinery used; the speed warning is listed and lifted by it.
  // Why the check is redundant here: LRR 58.3 lets a ship enter no more systems than its move value; the card raises
  // that value by one for one ship, so a single ship one system short reaches the active system.
  test('legendary:tempesta used: one ship one system short is waived', () => {
    const table = flight({ carrier: 1 });
    quote(table.pack, id, 'apply +1 to the move value of 1 of your ships during this tactical action');
    expectWaived(warningsOf(table, table.move), 'speedShort', id);
  });

  // LRR 58.3.6: "the number of systems the ship enters cannot exceed its move value."
  // Checks: the same flight with the planet controlled but the card not named in the entry.
  // Why the check is NOT redundant here: the card acts only when it is exhausted for this tactical action.
  test('legendary:tempesta controlled but not used leaves the speed warning standing', () => {
    const table = flight({ carrier: 1 }, { uses: false });
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // "... apply +1 to the move value ..."
  // Checks: a carrier three systems away is two short; one more is not enough.
  // Why the check is NOT redundant here: the card gives +1, not any distance.
  test('legendary:tempesta does not cover a ship two systems short', () => {
    const table = flight({ carrier: 1 }, { to: FAR });
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // "... of 1 of your ships ..."
  // Checks: two carriers one system short make one warning of their type; only one of them gets the +1.
  // Why the check is NOT redundant here: the second carrier still cannot reach the active system.
  test('legendary:tempesta does not cover two ships of the same type', () => {
    const table = flight({ carrier: 2 });
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // "... of 1 of your ships ..."
  // Checks: a carrier and a dreadnought, each one system short: exactly one of the two warnings is lifted.
  // Why the check is NOT redundant here for the other: the card names one ship.
  test('legendary:tempesta lifts one of two ships of different types, not both', () => {
    const table = flight({ carrier: 1, dreadnought: 1 });
    const marks = waivedBy(warningsOf(table, table.move));
    expect(marks).toHaveLength(2);
    expect(marks.filter(by => by.includes(id))).toHaveLength(1);
  });

  // LRR 53.3: "Players can use the abilities on the legendary planet ability cards in their play area." 53.2: the card
  //  comes with the control of the planet.
  // Checks: the refinery named by a player who does not control Tempesta is warned of as not held.
  // Why the check is NOT redundant here: the card lies in the play area of the controller only.
  test('legendary:tempesta used without controlling Tempesta is warned of as not held', () => {
    const table = flight({ carrier: 1 }, { control: false });
    expectStanding(warningsOf(table, table.move), 'componentNotHeld');
  });

  // "You may exhaust this card ..."; LRR 34.4: an exhausted card cannot be used until readied.
  // Checks: a second tactical action of the round naming the refinery is warned of as exhausted.
  test('legendary:tempesta is exhausted by its use: a second use in the round is warned of', () => {
    const first = using(tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] }), id);
    const second = using(tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1 } }] }), id);
    const table = bench({ faction: 'letnev', expansions: ['te'], units: { [HOME]: { carrier: 1 } }, entries: [first, second], game: { planetControl: { tempesta: 'me' } } });
    expectStanding(warningsOf(table, second), 'componentExhausted');
  });

  test('legendary:tempesta is a play effect that waives the speed check', () => {
    const { pack } = flight({ carrier: 1 });
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['speedShort']);
  });
});
