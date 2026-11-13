import { describe, expect, test } from 'vitest';
import type { Entry, Opponent } from '../../../types';
import { adjust, bench, componentAction, effect, endOf, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './shareknowledge';

const GRAVITY_DRIVE = 'technology:gd';
const DEEPWROUGHT: Opponent = { id: 'o1', faction: 'deepwrought', vp: 0, seat: 2, color: 2 };
const note = (owner: string) => `${id}@${owner}`;

/** I play the Letnev, hold the Deepwrought's note and take their Gravity Drive with it. */
const play = (): Entry => componentAction(note('o1'), { choices: { technology: GRAVITY_DRIVE } } as Partial<Entry>);
const letnev = (rounds: Entry[][]) => bench({
  faction: 'letnev', expansions: ['pok', 'te'], rounds, start: { promissory: [note('o1')] },
  game: { opponents: [DEEPWROUGHT], start: { me: { promissory: [note('o1')] }, opponents: { o1: { technologies: [GRAVITY_DRIVE] } } } },
});

describe('promissory:shareknowledge Share Knowledge', () => {
  // "ACTION: Place this card faceup in your play area and gain 1 non-faction, non-unit upgrade technology that the
  //  Deepwrought player owns; place that technology on this card."
  // Checks: the component action that plays the note with the choice of Gravity Drive gives me that technology for
  // the rest of the round.
  // Why the default count does not apply: a technology is otherwise gained by research (90); the note gives one the
  // Deepwrought player owns, without research and without cost.
  test('promissory:shareknowledge played, I hold the chosen technology of the Deepwrought player', () => {
    const table = letnev([[play(), adjust({})]]);
    quote(table.pack, id, 'gain 1 non-faction, non-unit upgrade technology that the Deepwrought player owns');
    expect(endOf(table).holdings.technologies).toContain(GRAVITY_DRIVE);
  });

  // "Return that technology to the deck and this card to the Deepwrought player at the end of the status phase."
  // Checks: in the next round the technology is gone and the note is the Deepwrought player's again.
  // Why the default count does not apply: the note has no "Then, return this card" (69.3) of its own; it stays face up
  // until the end of the status phase and only then goes back, taking the technology with it.
  test('promissory:shareknowledge at the end of the status phase the technology goes and the note returns', () => {
    const table = letnev([[play(), statusTokens(0, 0, 0)], [adjust({})]]);
    const end = endOf(table);
    expect(end.holdings.technologies).not.toContain(GRAVITY_DRIVE);
    expect(end.holdings.promissory).not.toContain(note('o1'));
    expect(end.rivals?.o1?.holdings.promissory).toContain(note('o1'));
    expect(end.rivals?.o1?.holdings.technologies).toContain(GRAVITY_DRIVE);
  });

  // "Return that technology to the deck and this card to the Deepwrought player at the end of the status phase."
  // Checks: the same when an opponent plays my note: the status phase takes the technology from them and the note comes back to me.
  // Why the check is NOT redundant here: the end of the status phase is every player's, not only mine.
  test('promissory:shareknowledge played by an opponent ends with the status phase too', () => {
    const hacan: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };
    const theirs = componentAction(note('me'), { owner: 'o1', choices: { technology: GRAVITY_DRIVE } } as Partial<Entry>);
    const table = bench({
      faction: 'deepwrought', expansions: ['pok', 'te'], rounds: [[theirs, statusTokens(0, 0, 0)], [adjust({})]],
      game: { opponents: [hacan], start: { me: { technologies: [GRAVITY_DRIVE] }, opponents: { o1: { promissory: [note('me')] } } } },
    });
    const during = bench({
      faction: 'deepwrought', expansions: ['pok', 'te'], rounds: [[theirs, adjust({})]],
      game: { opponents: [hacan], start: { me: { technologies: [GRAVITY_DRIVE] }, opponents: { o1: { promissory: [note('me')] } } } },
    });
    expect(endOf(during).rivals?.o1?.holdings.technologies).toContain(GRAVITY_DRIVE);
    const end = endOf(table);
    expect(end.rivals?.o1?.holdings.technologies).not.toContain(GRAVITY_DRIVE);
    expect(end.rivals?.o1?.holdings.promissory).not.toContain(note('me'));
    expect(end.holdings.promissory).toContain(note('me'));
  });

  // LRR 69.2: "A player cannot play their own promissory note."
  // Checks: the Deepwrought player playing their own note is warned of.
  // Why the check is NOT redundant here: the note gives technologies to other players only.
  test('promissory:shareknowledge the Deepwrought player cannot play their own note', () => {
    const own = componentAction(note('me'));
    const table = bench({ faction: 'deepwrought', expansions: ['pok', 'te'], start: { promissory: [note('me')] }, entries: [own] });
    expectStanding(warningsOf(table, own), 'ownPromissory');
  });

  test.todo('promissory:shareknowledge a unit upgrade, a faction technology or one the Deepwrought player does not own is not gained: no warning code says so yet (a new code at the step `component`, "not a technology this note gives")');

  test('promissory:shareknowledge is a play effect', () => {
    const { pack } = letnev([[]]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
