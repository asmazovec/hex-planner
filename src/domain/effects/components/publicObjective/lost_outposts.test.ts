import { describe, expect, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, endOf, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './lost_outposts';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = () => {
  const status = score();
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], entries: [status], game: { planetControl: { h1: 'me', h2: 'me', t1: 'me', t2: 'me' } } }) };
};

describe('publicObjective:lost_outposts Discover Lost Outposts', () => {
  // "Control 2 planets that have attachments."
  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: four planets controlled, none with an attachment: scoring is warned of, none of two; the objective is
  // scored all the same.
  // Why the check is NOT redundant here: planets without attachments are outside the card.
  test('publicObjective:lost_outposts planets without attachments are warned of', () => {
    const t = table();
    quote(t.pack, id, 'Control 2 planets that have attachments.');
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(warningsOf(t, t.status).find(w => w.code === UNMET)?.params).toMatchObject({ objective: id, have: 0, need: 2 });
    expect(endOf(t).holdings.scored).toContain(id);
  });

  test.todo('publicObjective:lost_outposts two controlled planets with attachments meet it: the replay attaches nothing yet (GameState.attachments is never filled), so the met case cannot be set up');
});
