import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './fs1';

/** A cruiser (move 2) flies from home to FAR, three systems away, or to FARTHER, four away. */
const toFar = () => tactical(FAR, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR, TARGET] }] });
const toFarther = () => tactical(FARTHER, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR, TARGET, FAR] }] });
const table = (entries: Entry[], hand: string[] = [id], cruisers = 1) =>
  bench({ faction: 'sol', units: { [HOME]: { cruiser: cruisers } }, start: { hand }, entries });
const speedOf = (warnings: ReturnType<typeof warningsOf>) => warnings.find(w => w.code === 'speedShort')?.params;

describe('actionCard:fs1 Flank Speed', () => {
  // "Apply +1 to the move value of each of your ships during this tactical action."
  // Checks: the card named in the action's «Used» lets the cruiser reach a system three away; no speed warning is
  // made at all.
  // Why the check is redundant here: the route check (58.3.6) compares the route with the move value, and the card
  // raises the move value of the cruiser from 2 to 3 for this action: the check runs against 3 and finds nothing.
  test('actionCard:fs1 played with the action gives each ship +1 move: three systems away is reached', () => {
    const move = using(toFar(), id);
    const fast = table([move]);
    quote(fast.pack, id, 'Apply +1 to the move value of each of your ships during this tactical action.');
    expectNone(warningsOf(fast, move), 'speedShort');
  });

  // "Apply +1 to the move value ..."
  // Checks: four systems away is still beyond the raised move value, and the warning names the move of 3.
  // Why the check is NOT redundant here: the card adds one, it does not lift the move value.
  test('actionCard:fs1 a route one system longer still warns, against the move value of 3', () => {
    const move = using(toFarther(), id);
    const warnings = warningsOf(table([move]), move);
    expectStanding(warnings, 'speedShort');
    expect(speedOf(warnings)).toMatchObject({ move: 3, steps: 4 });
  });

  // Ruling (Flank Speed 1): "A second Flank Speed cannot be played to give +2 to the move value of each ship."
  // Checks: two copies named in the same action still give +1: four systems away is short, against 3.
  // Why the check is NOT redundant here: the move value is raised once per action, whatever the copies.
  test('actionCard:fs1 two copies in one action still add only one', () => {
    const move = using(toFarther(), id, id);
    const warnings = warningsOf(table([move], [id, id]), move);
    expect(speedOf(warnings)).toMatchObject({ move: 3, steps: 4 });
  });

  // LRR 58.3.6 / 41.1: a ship moves no farther than its move value.
  // Checks: without the card the cruiser is short of three systems, against its move of 2.
  // Why the check is NOT redundant here: no card was played.
  test('actionCard:fs1 not played, the cruiser is short of three systems', () => {
    const move = toFar();
    const warnings = warningsOf(table([move]), move);
    expectStanding(warnings, 'speedShort');
    expect(speedOf(warnings)).toMatchObject({ move: 2, steps: 3 });
  });

  // "... during this tactical action."
  // Checks: the card played in a first tactical action does not help a second one of the same round.
  // Why the check is NOT redundant here: the card lasts for its own tactical action only.
  test('actionCard:fs1 played in an earlier action does not help the next one', () => {
    const first = using(tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] }), id);
    const second = toFar();
    const warnings = warningsOf(table([first, second], [id], 2), second);
    expectStanding(warnings, 'speedShort');
    expect(speedOf(warnings)).toMatchObject({ move: 2 });
  });

  // LRR 22.1: a card not held cannot be played.
  // Checks: naming the card without holding it is warned of; it is the card, not the warning, that the plan keeps.
  // Why the check is NOT redundant here: the card must be in hand to be played.
  test('actionCard:fs1 named without being in hand is warned of', () => {
    const move = using(toFar(), id);
    expectStanding(warningsOf(table([move], []), move), 'componentNotHeld');
  });

  test('actionCard:fs1 changes the move value: a modifyWhenNamed of speed, no waiver', () => {
    const { pack } = table([]);
    expect(effect(pack, id).modifyWhenNamed?.speed).toBeTypeOf('function');
  });
});
