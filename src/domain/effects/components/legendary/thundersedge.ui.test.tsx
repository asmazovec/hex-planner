import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, FAR, quote, tactical, using } from '../kit';
import { id } from './thundersedge';

uiBench();

const table = (entry: ReturnType<typeof tactical>, control: boolean) =>
  bench({ faction: 'letnev', expansions: ['te'], entries: [entry], game: { planetControl: control ? { thundersedge: 'me' } : {} } });

// LRR 53.3 with 53.2: the card is in the play area of the player who controls the planet.
// Checks: Jupiter Brain named in «Used» by a player who does not control Thunder's Edge shows the not-held warning, standing.
// Why the check is NOT redundant here: the card is not theirs to exhaust.
test('legendary:thundersedge named without controlling the planet shows the not-held warning', () => {
  const entry = using(tactical(FAR), id);
  quote(table(entry, false).pack, id, 'exhaust this card at the end of your turn');
  showWarnings(table(entry, false), entry);
  expectShownStanding('componentNotHeld');
});

// "You may exhaust this card at the end of your turn to perform another action."
// Checks: with the planet controlled, the card named once shows no warning of it not being held.
// Why nothing is warned of: the card is in the player's play area and ready.
test('legendary:thundersedge named while controlling the planet shows no not-held warning', () => {
  const entry = using(tactical(FAR), id);
  showWarnings(table(entry, true), entry);
  expectNotShown('componentNotHeld');
});
