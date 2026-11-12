import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, expectStanding, quote, using, warningsOf } from '../kit';
import { id } from './riderm';

const KELERES = 'keleresm';
const note = (owner: string) => `${id}@${owner}`;

/** I play the Letnev and hold the Rider of the Keleres opponent o1; the agenda-phase entry plays it. */
const letnevWithRider = () => {
  const vote = using(adjust({}, 'agenda'), note('o1'));
  return {
    vote,
    ...bench({
      faction: 'letnev', expansions: ['pok'], entries: [vote], start: { promissory: [note('o1')] },
      game: { opponents: [{ id: 'o1', faction: KELERES, vp: 0, seat: 2, color: 2 }] },
    }),
  };
};

describe('promissory:riderm Keleres Rider', () => {
  // "After an agenda is revealed: You cannot vote on this agenda. Predict aloud an outcome of this agenda."
  // Checks: the note is a reminder with no step: the agenda phase has none, so no block of an editor shows it.
  // Why the check is NOT redundant here: nothing is validated, because nothing of it is counted: votes, the
  // prediction and whether it comes true are not part of the plan; the card and the trade goods gained on a correct
  // prediction are entered by the player as gains.
  test('promissory:riderm is a hint without a step: the agenda is not counted', () => {
    const { pack } = letnevWithRider();
    quote(pack, id, 'You cannot vote on this agenda. Predict aloud an outcome of this agenda.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  // "Then, return this card to the Keleres player." LRR 69.3.
  // Checks: played by another player, the note goes back to the Keleres player who owns it.
  // Why the check is NOT redundant here: the return is the common rule of notes, replayed for every note whose text
  // ends with it; the Rider adds nothing of its own to it.
  test('promissory:riderm played by another player goes back to the Keleres player', () => {
    const table = letnevWithRider();
    quote(table.pack, id, 'Then, return this card to the Keleres player.');
    const end = endOf(table);
    expect(end.holdings.promissory).not.toContain(note('o1'));
    expect(end.rivals?.o1?.holdings.promissory).toContain(note('o1'));
  });

  // LRR 69.2: "A player cannot play their own promissory note."
  // Checks: the Keleres player playing their own Rider is warned of.
  // Why the check is NOT redundant here: the Rider says nothing that lets its owner play it.
  test('promissory:riderm the Keleres player cannot play their own Rider', () => {
    const vote = using(adjust({}, 'agenda'), note('me'));
    const table = bench({ faction: KELERES, expansions: ['pok'], entries: [vote], start: { promissory: [note('me')] } });
    expectStanding(warningsOf(table, vote), 'ownPromissory');
  });
});
