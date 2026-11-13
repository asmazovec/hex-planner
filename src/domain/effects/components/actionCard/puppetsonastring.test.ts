import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../types';
import { bench, effect, expectNone, expectStanding, expectWaived, HOME, NEAR, planned, quote, tactical, using, warningsOf } from '../kit';
import { id } from './puppetsonastring';

const pass = (): Entry => planned({ type: 'pass' } as EntryBody);
const move = () => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
const table = (entries: Entry[]) =>
  bench({ faction: 'sol', expansions: ['te'], units: { [HOME]: { cruiser: 2 } }, start: { hand: [id] }, entries });

describe('actionCard:puppetsonastring Puppets on a String', () => {
  // "At the end of a player's turn, if you have passed: Perform 1 action."
  // Checks: after my pass a tactical action names the card; the warning that a passed player acts is listed and lifted.
  // Why the check is redundant here: LRR 3.3 ends the turns of a passed player, and the card gives that player one
  // action all the same.
  test('actionCard:puppetsonastring lets a passed player perform one action: actionAfterPass is waived', () => {
    const puppet = using(move(), id);
    const puppets = table([pass(), puppet]);
    quote(puppets.pack, id, 'Perform 1 action.');
    expectWaived(warningsOf(puppets, puppet), 'actionAfterPass', id);
  });

  // LRR 3.3: "After a player has passed, they cannot perform any additional actions during that action phase."
  // Checks: the same action after the pass without the card stands warned.
  // Why the check is NOT redundant here: the card is held, not played.
  test('actionCard:puppetsonastring held but not played: an action after the pass stands warned', () => {
    const late = move();
    expectStanding(warningsOf(table([pass(), late]), late), 'actionAfterPass');
  });

  // "Perform 1 action." Ruling 6 (tirules2, Puppets On A String): "The active player is still considered passed during
  //  their action."
  // Checks: the card covers its one action; a second action after it, without a card, stands warned.
  // Why the check is NOT redundant here: one card is one action, and the player stays passed.
  test('actionCard:puppetsonastring covers one action only: the next one stands warned', () => {
    const puppet = using(move(), id);
    const again = move();
    expectStanding(warningsOf(table([pass(), puppet, again]), again), 'actionAfterPass');
  });

  // "... if you have passed ..."
  // Checks: before the pass an action breaks nothing, so there is nothing for the card to lift.
  // Why the check is NOT redundant here: there is no check to lift; the card's condition is not met.
  test('actionCard:puppetsonastring before the pass there is no warning to lift', () => {
    const early = using(move(), id);
    expectNone(warningsOf(table([early, pass()]), early), 'actionAfterPass');
  });

  test('actionCard:puppetsonastring waives actionAfterPass for its own entry only', () => {
    const { pack } = table([]);
    expect(effect(pack, id).permit?.map(w => [w.code, w.lasts])).toEqual([['actionAfterPass', undefined]]);
  });
});
