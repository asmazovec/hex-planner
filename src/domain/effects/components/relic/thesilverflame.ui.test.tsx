import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Act } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import type { Player } from '../../../players';
import { bench, NEAR, quote, tactical } from '../kit';
import { id } from './thesilverflame';

uiBench();

const RIVAL: Player = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };
const giving = (relic: string): Entry => tactical(NEAR, { acts: [{ kind: 'transaction', with: 'o1', give: { components: [relic] }, get: {} } as Act] });
const table = (entry: Entry, relics: string[]) => bench({
  faction: 'sol', expansions: ['te'], units: { [NEAR]: { carrier: 1 } }, entries: [entry],
  game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me: { relics }, opponents: {} } },
});

// "The Silver Flame may be exchanged as part of a transaction."
// Checks: a deal that gives the Silver Flame keeps it in the deal, and its warning reads as allowed by the card.
// Why the check is redundant here: relics are not exchanged (94.3), except this one by its own text.
test('relic:thesilverflame given in a deal reads as allowed by The Silver Flame', () => {
  const give = giving(id);
  const flame = table(give, [id]);
  quote(flame.pack, id, 'may be exchanged as part of a transaction');
  const live = showWarnings(flame, give);
  expect(live.entry().type).toBe('tactical');
  expectShownWaived('transactionKind', 'The Silver Flame');
});

// Transactions note 1: "Relics themselves cannot be."
// Checks: another relic given in the same way shows its warning standing.
// Why the check is NOT redundant here: the Silver Flame allows only itself.
test('relic:thesilverflame another relic given in a deal shows its warning standing', () => {
  const give = giving('relic:heartofixth');
  showWarnings(table(give, [id, 'relic:heartofixth']), give);
  expectShownStanding('transactionKind');
});
