import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, componentAction, quote } from '../kit';
import { id } from './pm';

uiBench();

// "ACTION: Exhaust this card and spend 1 token from your strategy pool ..."
// Checks: played with an empty strategy pool, the component action shows the missing token as a standing warning.
// Why the check is NOT redundant here: the token is the card's price; nothing lifts it.
test('technology:pm played with an empty strategy pool shows the missing token', () => {
  const play = componentAction(id, { choices: { player: 'o1' } });
  const table = bench({ faction: 'hacan', start: { technologies: [id] }, entries: [adjust({ strategy: -2 }), play] });
  quote(table.pack, id, 'spend 1 token from your strategy pool');
  showWarnings(table, play);
  expectShownStanding('shortStrategy');
});
