import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, expectStanding, expectWaived, quote, secondary, using, warningsOf } from '../kit';
import { id } from './acq';

/** The Winnu player's note in my hand, under its owner's address. */
const NOTE = `${id}@winnu`;
/** Politics' secondary costs a strategy token (83.4, 20.5). */
const politics = () => secondary(CARD.politics);
const table = (faction: string, entries: Entry[], promissory = [NOTE]) =>
  bench({ faction, start: { promissory }, entries });

describe('promissory:acq Acquiescence', () => {
  // "You do not have to spend or place a command token to resolve the secondary ability of that strategy card."
  // Checks: a secondary that names the note in «Used» spends no strategy token: the pool stays at its 2.
  // Why the check is redundant here: the token is the price of a secondary (20.5, 83.4), and the note says that this
  // secondary is resolved without it.
  test('promissory:acq a secondary that uses the note spends no strategy token', () => {
    const play = using(politics(), NOTE);
    const sol = table('sol', [play]);
    quote(sol.pack, id, 'You do not have to spend or place a command token to resolve the secondary ability');
    expect(endOf(sol).strategy).toBe(2);
  });

  // Checks: with the strategy pool empty the secondary is still entered; the warning that no token is left is listed
  // and lifted by the note.
  // Why the check is redundant here: the note frees the secondary of its token, so an empty pool does not matter.
  test('promissory:acq with no strategy token left the warning of the secondary is waived', () => {
    const play = using(politics(), NOTE);
    expectWaived(warningsOf(table('sol', [adjust({ strategy: -2 }), play]), play), 'shortStrategy', NOTE);
  });

  // LRR 20.5: "a player can spend command tokens from their strategy pool to resolve the secondary ability of a
  //  strategy card that another player has resolved".
  // Checks: the same secondary without the note costs its token, and an empty pool stands.
  // Why the check is NOT redundant here: the note is held but not played.
  test('promissory:acq not played, the secondary costs its token and an empty pool stands', () => {
    const play = politics();
    expectStanding(warningsOf(table('sol', [adjust({ strategy: -2 }), play]), play), 'shortStrategy');
    expect(endOf(table('sol', [politics()])).strategy).toBe(1);
  });

  // LRR 69.2: "A player cannot play their own promissory note."
  // Checks: the Winnu playing their own note is warned of, and their secondary is not freed by it.
  // Why the check is NOT redundant here: the note is played by the other players, never by its owner.
  test('promissory:acq the Winnu\'s own note frees nothing: ownPromissory and the empty pool stand', () => {
    const play = using(politics(), `${id}@me`);
    const warnings = warningsOf(table('winnu', [adjust({ strategy: -2 }), play], [`${id}@me`]), play);
    expectStanding(warnings, 'ownPromissory');
    expectStanding(warnings, 'shortStrategy');
  });

  test('promissory:acq is a play effect that waives the strategy token of the secondary', () => {
    const { pack } = table('sol', []);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['shortStrategy']);
  });
});
