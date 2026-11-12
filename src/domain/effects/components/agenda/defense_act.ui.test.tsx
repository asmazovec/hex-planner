import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { adjust, bench, primary, quote } from '../kit';
import { id } from './defense_act';

uiBench();

const law = (): Entry => ({ ...adjust({}, 'agenda'), gains: [id] });
const build = (): Entry => primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }] });

// "For: Each player can have any number of PDS units on planets they control."
// Checks: Construction puts a third PDS on Home One under the law; the card's warnings show the limit of a planet in
// the allowed look, naming the law.
// Why the check is redundant here: the law removes the two-PDS limit of a planet (63.3) for planets the player controls.
test('agenda:defense_act a third PDS on a planet reads as allowed by Homeland Defense Act', () => {
  const third = build();
  const table = bench({ faction: 'sol', rounds: [[law()], [third]], game: { pds: { h1: 2 } } });
  quote(table.pack, id, 'any number of PDS units on planets they control');
  showWarnings(table, third);
  expectShownWaived('structureLimit', 'Homeland Defense Act');
});

// LRR 63.3: "Each planet can have a maximum of two PDS units."
// Checks: without the law the same third PDS shows the warning standing.
// Why the check is NOT redundant here: the law was never passed.
test('agenda:defense_act not in play, the third PDS shows its warning standing', () => {
  const third = build();
  showWarnings(bench({ faction: 'sol', entries: [third], game: { pds: { h1: 2 } } }), third);
  expectShownStanding('structureLimit');
});
