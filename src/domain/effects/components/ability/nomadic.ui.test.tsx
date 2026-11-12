import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry, ExtensionCode } from '../../../types';
import { bench, quote, statusTokens } from '../kit';
import { id } from './nomadic';

uiBench();

/** The check pass 2 adds to the status step, LRR 61.16. */
const CODE = 'scoreWithoutHome' as ExtensionCode;

const scoring = (faction: string) => {
  const status = { ...statusTokens(2, 0, 0), scored: ['publicObjective:develop'], vp: 1 } as Entry;
  return { status, table: bench({ faction, entries: [status], game: { planetControl: { h1: 'enemy' } } }) };
};

// "You can score objectives even if you do not control the planets in your home system."
// Checks: the status entry scores a public objective while Home One is lost; its warning is on the screen in the
// allowed look, naming Nomadic.
// Why the check is redundant here: 61.16 forbids scoring a public objective without the home system, and the ability
// allows it to the Saar.
test.fails('ability:nomadic the objective scored without the home system reads as allowed by Nomadic', () => {
  const saar = scoring('saar');
  quote(saar.table.pack, id, 'You can score objectives even if you do not control the planets in your home system.');
  showWarnings(saar.table, saar.status);
  expectShownWaived(CODE, 'Nomadic');
});

// LRR 61.16: "A player cannot score public objectives if that player does not control each planet in their home system."
// Checks: another faction's same scoring shows the warning standing (red until the status step makes the check).
// Why the check is NOT redundant here: nothing this player holds lifts 61.16.
test.fails('ability:nomadic another faction scoring without its home system sees the warning standing', () => {
  const sol = scoring('sol');
  showWarnings(sol.table, sol.status);
  expectShownStanding(CODE);
});
