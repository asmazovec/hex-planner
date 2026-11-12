import { describe, expect, test } from 'vitest';
import { genericNotes, startForFaction } from '../../../holdings';
import type { AnyWarningCode, Opponent } from '../../../types';
import { bench, expectStanding, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './hubris';

const ALLIANCE = 'promissory:<color>_an';
const SOL: Opponent = { id: 'sol1', faction: 'sol', vp: 0, seat: 2, color: 2 };
/** The code pass 2 adds to the transaction step for a note its receiver may not take (Hubris). */
const REFUSED = 'noteRefused' as AnyWarningCode;

/** The Sol player gives me their Alliance in a transaction of my turn. */
const gift = (faction: string) => {
  const turn = tactical(NEAR, { acts: [{ kind: 'transaction', with: 'sol1', give: {}, get: { components: [`${ALLIANCE}@sol1`] } }] });
  return { turn, ...bench({ faction, expansions: ['pok'], entries: [turn], game: { opponents: [SOL], start: { me: {}, opponents: { sol1: { promissory: [`${ALLIANCE}@sol1`] } } } } }) };
};

describe('ability:hubris Hubris', () => {
  // "During setup, purge your "Alliance" promissory note."
  // Checks: the Mahact player's start holds the generic notes of their colour but their Alliance.
  // Why the default deal does not apply: every player begins with the generic notes (69), Alliance among them with
  // Prophecy of Kings; the ability purges the Mahact one at setup.
  test.fails('ability:hubris the Mahact player begins without their Alliance', () => {
    const { pack } = bench({ faction: 'mahact', expansions: ['pok'] });
    quote(pack, id, 'During setup, purge your "Alliance" promissory note.');
    const start = startForFaction({ promissory: genericNotes(pack, 'me') }, '', 'mahact', pack);
    expect(start.promissory).not.toContain(`${ALLIANCE}@me`);
    expect(start.promissory).toContain('promissory:<color>_ta@me');
  });

  // LRR 69: every player begins with the generic notes of their colour.
  // Checks: another faction keeps its Alliance.
  // Why the default deal stands here: the purge is printed on the Mahact sheet.
  test('ability:hubris another faction begins with its Alliance', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    expect(startForFaction({ promissory: genericNotes(pack, 'me') }, '', 'sol', pack).promissory).toContain(`${ALLIANCE}@me`);
  });

  // "Other players cannot give you their 'Alliance" promissory note."
  // Checks: the Sol player gives the Mahact player their Alliance in a transaction: it is warned of.
  // Why a check is added here: the transaction rules (94.3) let a note be given; the ability forbids this one to the
  // Mahact player, so the transaction must warn (the plan forbids nothing).
  test('ability:hubris another player\'s Alliance given to the Mahact player is warned of', () => {
    const mahact = gift('mahact');
    quote(mahact.pack, id, 'Other players cannot give you their \'Alliance" promissory note.');
    expectStanding(warningsOf(mahact, mahact.turn), REFUSED);
  });

  // LRR 94.3: promissory notes can be exchanged in a transaction.
  // Checks: the same gift to another faction is no breach.
  test('ability:hubris another faction may receive the Alliance', () => {
    const letnev = gift('letnev');
    expect(warningsOf(letnev, letnev.turn).map(w => w.code)).not.toContain(REFUSED);
  });
});
