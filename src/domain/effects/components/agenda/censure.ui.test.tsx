import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry, EntryBody, ExtensionCode } from '../../../types';
import { bench, planned, quote, tactical, TARGET } from '../kit';
import { id } from './censure';

uiBench();

/** The check the law brings, a new code of pass 2. */
const CODE = 'actionCardBarred' as ExtensionCode;
const CARD = 'actionCard:cripple';
const elected = (extra: Partial<Entry> = {}): Entry =>
  planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'agenda', { gains: [id], ...extra });
const table = (agenda: Entry, move: Entry) => bench({
  faction: 'sol', expansions: ['pok'], start: { hand: [CARD] }, rounds: [[agenda], [move]],
  game: { opponents: [{ id: 'r1', faction: 'hacan', vp: 0, seat: 2, color: 2 }] },
});

// "The elected player cannot play action cards."
// Checks: elected in round 1, I name an action card in «Used» of a tactical action of round 2: the card is taken
// (the plan forbids nothing) and the warning stands on the screen.
// Why the check is NOT redundant here: the law forbids; nothing lifts it.
test('agenda:censure an action card chosen in «Used» by the elected player shows its warning, standing', async () => {
  const move = tactical(TARGET);
  const t = table(elected(), move);
  quote(t.pack, id, 'The elected player cannot play action cards.');
  const live = showUses(t, move);
  await use('Cripple Defenses');
  expect(live.entry().uses).toContain(CARD);
  expectShownStanding(CODE);
});

// Checks: another player elected: the same card chosen shows no such warning.
// Why the check is NOT redundant here: the law binds the elected player only.
test('agenda:censure another player elected: my action card shows no warning of the law', async () => {
  const move = tactical(TARGET);
  const live = showUses(table(elected({ owner: 'r1' }), move), move);
  await use('Cripple Defenses');
  expect(live.entry().uses).toContain(CARD);
  expectNotShown(CODE);
});
