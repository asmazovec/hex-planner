import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import { bench, primary, quote } from '../kit';
import { id } from './propagation';

uiBench();

const table = (faction: string) => {
  const play = primary(CARD.technology, { researched: ['technology:st'], tokens: { tactic: 3 } });
  return { play, table: bench({ faction, entries: [play] }) };
};

// "When you would research a technology: Gain 3 command tokens instead."
// Checks: the Nekro player's Technology researches one technology and places 3 tokens; the list of the entry shows no
// warning that more tokens were given than the card gives.
// Why the default count does not apply: the research gives 3 command tokens to the Nekro player instead.
test('ability:propagation the 3 tokens a research gives are shown as within what the card gives', () => {
  const nekro = table('nekro');
  quote(nekro.table.pack, id, 'Gain 3 command tokens instead.');
  showWarnings(nekro.table, nekro.play);
  expectNotShown('tokensOver');
});

// LRR 91.2, in short: the primary of Technology researches technologies; the card gives no command tokens.
// Checks: another faction placing the same 3 tokens is shown the warning standing.
// Why the check is NOT redundant here: Propagation is the Nekro Virus's own.
test('ability:propagation another faction placing 3 tokens on Technology sees the warning stand', () => {
  const sol = table('sol');
  showWarnings(sol.table, sol.play);
  expectShownStanding('tokensOver');
});

test.todo('ability:propagation the Technology card editor offers 3 tokens to distribute for each research of the Nekro player: the editor reads freeTokens of the card, which pass 2 makes ask the research');
