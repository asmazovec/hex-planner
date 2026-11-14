import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../types';
import type { GameState } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectNone, expectStanding, expectWaived, HOME, NEAR, planned, quote, tactical, using, warningsOf } from '../kit';
import { id } from './ralnelhero';

const pass = (): Entry => planned({ type: 'pass' } as EntryBody, 'action');
const ralnel = (rounds: Entry[][], faction = 'ralnel') =>
  bench({ faction, expansions: ['pok', 'te'], units: { [HOME]: { cruiser: 1 } }, start: { leaders: { [id]: 'unlocked' } }, rounds });
const tokens = (state: GameState) => state.tactic + state.fleet + state.strategy;

describe('leader:ralnelhero Director Nel — Signal Intrusion', () => {
  // "After the last player passes: You may choose to no longer be passed"
  // Checks: the hero named in the Ral Nel's pass lifts the warning of a tactical action taken after that pass.
  // Why the check is redundant here: LRR 3.3 ends a player's turns with their pass, and the hero says they are no
  // longer passed; they may take any number of turns before passing again (Director Nel note 2).
  test('leader:ralnelhero played with the pass lifts the turn-after-pass check for the rest of the round', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const table = ralnel([[using(pass(), id), move]]);
    quote(table.pack, id, 'You may choose to no longer be passed');
    expectWaived(warningsOf(table, move), 'actionAfterPass', id);
  });

  // Checks: two turns after the pass are both covered, and the pass that follows them makes no warning of its own.
  // Why the check is redundant here: "no longer passed" lasts until the player passes again.
  test('leader:ralnelhero covers every turn taken before the player passes again', () => {
    const first = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const second = planned({ type: 'component', note: 'any' } as EntryBody, 'action');
    const again = pass();
    const table = ralnel([[using(pass(), id), first, second, again]]);
    expectWaived(warningsOf(table, first), 'actionAfterPass', id);
    expectWaived(warningsOf(table, second), 'actionAfterPass', id);
    expectNone(warningsOf(table, again), 'actionAfterPass');
  });

  // LRR 3.3: "After a player has passed, they cannot perform any additional actions during that action phase."
  // Checks: without the hero the turn after the pass is warned of.
  // Why the check is NOT redundant here: the hero is not played.
  test('leader:ralnelhero not played: a turn after the pass is warned of', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const table = ralnel([[pass(), move]]);
    quote(table.pack, id, 'gain 2 command tokens, draw 1 action card, and purge this card');
    expectStanding(warningsOf(table, move), 'actionAfterPass');
  });

  // Checks: the hero played in round 1 does nothing for a turn after the pass of round 2.
  // Why the check is NOT redundant here: the hero unpasses the player once, in the action phase it is played in.
  test('leader:ralnelhero played in round 1 does not cover a turn after the pass of round 2', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const table = ralnel([[using(pass(), id)], [pass(), move]]);
    expectStanding(warningsOf(table, move), 'actionAfterPass');
  });

  // "... gain 2 command tokens ..."
  // Checks: the pass that plays the hero leaves the player with 2 command tokens more than the same pass without it.
  // Why this is counted: command tokens are counted by the plan; the hero gives them, so the count must hold them.
  test('leader:ralnelhero gives 2 command tokens', () => {
    const played = endOf(ralnel([[using(pass(), id)]]));
    const plain = endOf(ralnel([[pass()]]));
    expect(tokens(played)).toBe(tokens(plain) + 2);
  });

  // "... and purge this card." LRR 51.12.
  // Checks: playing the hero purges it, so playing it again is warned of.
  test('leader:ralnelhero is purged by its play', () => {
    const again = using(pass(), id);
    const table = ralnel([[using(pass(), id)], [again]]);
    expect(endOf(table).holdings.leaders[id]).toBe('purged');
    expectStanding(warningsOf(table, again), 'componentNotHeld');
  });

  test('leader:ralnelhero is a play effect that lifts the turn-after-pass check for the round', () => {
    const { pack } = ralnel([[]]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).permit?.map(w => [w.code, w.lasts])).toEqual([['actionAfterPass', 'round']]);
  });
});
