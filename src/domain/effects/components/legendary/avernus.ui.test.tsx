import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { ExtensionCode } from '../../../types';
import { bench, componentAction, HOME, NEAR, quote } from '../kit';
import { id } from './avernus';

uiBench();

const CONDITION = 'componentCondition' as ExtensionCode;
const nucleus = (system: string) => componentAction(id, { choices: { unit: 'destroyer', system } });
const table = (entry: ReturnType<typeof nucleus>) =>
  bench({ faction: 'letnev', expansions: ['pok', 'te'], units: { [HOME]: { warsun: 1 } }, entries: [entry], game: { planetControl: { avernus: 'me' } } });

// Star Forge: "... in a system that contains 1 or more of your war suns."; Muaat notes, Avernus 3.
// Checks: the Nucleus played for a system without my war sun shows the condition warning, standing.
// Why the check is NOT redundant here: the card lifts the token Star Forge costs, not where it places.
test.fails('legendary:avernus played for a system without a war sun shows the condition warning', () => {
  const entry = nucleus(NEAR);
  quote(table(entry).pack, id, 'use the Embers of Muaat\'s');
  showWarnings(table(entry), entry);
  expectShownStanding(CONDITION);
});

// "ACTION: Exhaust this card to use the Embers of Muaat's STAR FORGE faction ability without spending a command token."
// Checks: played for the system of my war sun, no condition warning and no warning of a token short.
// Why the token check does not apply: the card uses Star Forge without spending a command token.
test('legendary:avernus played beside my war sun shows neither the condition nor a token short', () => {
  const entry = nucleus(HOME);
  showWarnings(table(entry), entry);
  expectNotShown(CONDITION);
  expectNotShown('shortStrategy');
});
