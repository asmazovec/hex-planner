import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './stymie';

describe('promissory:stymie Stymie', () => {
  // "After another player moves ships into a system that contains 1 or more of your units: You may place 1 command
  //  token from that player's reinforcements in any non-home system."
  // Checks: the note is a reminder in the movement block, and nothing else.
  // Why nothing is validated: the note is played by its holder in another player's turn, on a token of that other
  // player; the plan has no entry of the holder there and does not keep the other players' reinforcements, so there is
  // no check of the plan to lift or to make.
  test('promissory:stymie is a hint in the movement block', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "You may place 1 command token from that player's reinforcements in any non-home system");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['movement']);
  });

  // Checks: a holder who is not the Arborec sees the reminder when ships move; the note is held, not played.
  // Why the check is NOT redundant here: Stymie has no effect while it is in a player's hand (Arborec, Stymie note 1),
  // so holding it changes nothing of the count.
  test('promissory:stymie held shows its reminder at movement and changes nothing of the board', () => {
    const table = bench({ faction: 'sol', start: { promissory: [`${id}@o1`] } });
    expect(hintsAt(table.pack, endOf(table), 'movement', ['rival']).map(c => c.id)).toContain(`${id}@o1`);
    expect(endOf(table).tokensOnMap).toEqual([]);
  });
});
