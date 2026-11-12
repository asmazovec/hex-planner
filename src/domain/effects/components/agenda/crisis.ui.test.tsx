import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../replay/cards/ids';
import type { Entry, EntryBody } from '../../../types';
import { bench, planned, quote } from '../kit';
import { id } from './crisis';

uiBench();

const crisis = (card: number): Entry =>
  planned({ type: 'adjustment', label: '', delta: {}, choices: { card } } as EntryBody, 'agenda', { gains: [id] });
const secondaryOf = (card: number, phase: Entry['phase']): Entry => planned({ type: 'secondary', card, effects: {} } as EntryBody, phase);

// "Each player may perform the secondary ability of the elected strategy card without spending a command token"
// Checks: my second secondary of Politics in the round, after the agenda elected Politics, shows its warning in the
// allowed look, naming the agenda.
// Why the check is redundant here: the agenda gives each player a resolution of the elected card's secondary of its own.
test.fails('agenda:crisis the repeated secondary of the elected card reads as allowed by Galactic Crisis Pact', () => {
  const again = secondaryOf(CARD.politics, 'agenda');
  const t = bench({ faction: 'sol', expansions: ['pok'], entries: [secondaryOf(CARD.politics, 'action'), crisis(CARD.politics), again] });
  quote(t.pack, id, 'Each player may perform the secondary ability of the elected strategy card');
  showWarnings(t, again);
  expectShownWaived('secondaryRepeated', 'Galactic Crisis Pact');
});

// Checks: without the agenda the same repeat is on the screen, standing.
// Why the check is NOT redundant here: only the agenda gives the second resolution.
test('agenda:crisis without the agenda the repeated secondary stands on the screen', () => {
  const again = secondaryOf(CARD.politics, 'agenda');
  const t = bench({ faction: 'sol', expansions: ['pok'], entries: [secondaryOf(CARD.politics, 'action'), again] });
  showWarnings(t, again);
  expectShownStanding('secondaryRepeated');
});
