import { describe, expect, test } from 'vitest';
import type { Act, AnyWarningCode, Entry } from '../../../types';
import type { Player } from '../../../players';
import type { Holdings } from '../../../../testing/old/domain/types';
import { adjust, before, bench, componentAction, effect, endOf, expectNone, expectStanding, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './hrf1';

/** The code pass 2 adds: fewer than three relic fragments of the type purged (LRR 73.1, step component). */
const FRAGMENTS_SHORT = 'relicFragmentsShort' as AnyWarningCode;
const RELIC = 'relic:shard';
const OTHER = 'exploration:irf1';
/** Fragments found while exploring: drawn from the deck, so in the gains of an entry (35.9). */
const found = (count: number, card = id): Entry => ({ ...adjust({}), gains: Array<string>(count).fill(card) });
/** The ACTION of the card: three fragments purged, the relic drawn in the gains. */
const purge = () => componentAction(id, { spends: [id, id, id], gains: [RELIC] });
const table = (entries: Entry[], game = {}) => bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1 } }, entries, game });
/** How many copies of a card a player holds, in whatever list pass 2 keeps them. */
const copies = (holdings: Holdings, card: string): number =>
  Object.values(holdings).flatMap(list => (Array.isArray(list) ? list : [])).filter(held => held === card).length;

describe('exploration:hrf1 Hazardous Relic Fragment', () => {
  // LRR 35.9: "If a player resolves an exploration card that has “relic fragment” in the title, they place that card
  //  faceup in their play area." "ACTION: Purge 3 of your hazardous relic fragments to gain 1 relic."
  // Checks: three fragments found are held before the action, and the action purges all three.
  // Why the check is redundant here: nothing is lifted; the fragments are what the action spends, so they must be held.
  test('exploration:hrf1 found fragments are held in the play area and the action purges three of them', () => {
    const action = purge();
    const fragments = table([found(3), action]);
    quote(fragments.pack, id, 'ACTION: Purge 3 of your hazardous relic fragments to gain 1 relic.');
    expect(copies(before(fragments.game, fragments.pack, action).holdings, id)).toBe(3);
    expect(copies(endOf(fragments).holdings, id)).toBe(0);
  });

  // LRR 73.2: "When a player is instructed to gain a relic, they draw the top card of the relic deck and place it faceup
  //  in their play area."
  // Checks: the relic drawn by the action is entered in its gains and held after it.
  // Why nothing is validated here: which relic is drawn only the player knows, so the plan takes it as entered.
  test('exploration:hrf1 the relic drawn by the action is held after it', () => {
    expect(endOf(table([found(3), purge()])).holdings.relics).toContain(RELIC);
  });

  // Checks: with three fragments of the type the action is warned of nothing.
  // Why the check is redundant here: the condition of the text is met.
  test('exploration:hrf1 with three fragments of its type the action makes no warning of fragments', () => {
    const action = purge();
    expectNone(warningsOf(table([found(3), action]), action), FRAGMENTS_SHORT);
  });

  // "Purge 3 of your hazardous relic fragments"
  // Checks: with two fragments the action is warned of; it still gains the relic, as the plan forbids nothing.
  // Why the check is NOT redundant here: the text asks for three.
  test('exploration:hrf1 with two fragments the action is warned of', () => {
    const action = purge();
    expectStanding(warningsOf(table([found(2), action]), action), FRAGMENTS_SHORT);
  });

  // "Purge 3 of your hazardous relic fragments"
  // Checks: three industrial fragments do not pay the hazardous action.
  // Why the check is NOT redundant here: the text names fragments of its own type.
  test('exploration:hrf1 fragments of another type do not pay its action', () => {
    const action = purge();
    expectStanding(warningsOf(table([found(3, OTHER), action]), action), FRAGMENTS_SHORT);
  });

  // LRR 35.9.2: "Relic fragments can be exchanged as part of transactions."
  // Checks: a fragment given to a neighbour is no transactionKind breach.
  // Why the check is redundant here: LRR 94.3 lists what changes hands, and relic fragments are among them.
  test('exploration:hrf1 is given in a transaction without a warning of its kind', () => {
    const rival: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
    const deal: Act = { kind: 'transaction', with: 'o1', give: { components: [id] }, get: {} };
    const turn = tactical(NEAR, { acts: [deal] });
    const trade = table([found(1), turn], { opponents: [rival], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } } });
    expectNone(warningsOf(trade, turn), 'transactionKind');
  });

  test('exploration:hrf1 is a played effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
