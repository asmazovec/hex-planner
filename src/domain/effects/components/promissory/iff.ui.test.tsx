import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { ExtensionCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import type { Player } from '../../../players';
import { bench, componentAction, FAR, NEAR, quote } from '../kit';
import { id } from './iff';

uiBench();

const PLACE = 'wormholeTokenPlace' as ExtensionCode;
const CREUSS: Player = { id: 'o1', faction: 'ghost', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;
const show = (systemId: string) => {
  const entry = componentAction(NOTE, { choices: { token: 'alpha', systemId } } as Partial<Entry>);
  const table = bench({ faction: 'letnev', start: { promissory: [NOTE] }, entries: [entry], game: { opponents: [CREUSS], enemyUnits: { [FAR]: { o1: { cruiser: 1 } } } } });
  showWarnings(table, entry);
  return table;
};

// "... into either a system that contains a planet you control or a non-home system that does not contain another
//  player's ships."
// Checks: the token put into FAR among the Creuss cruiser shows the warning of its place, standing.
// Why the check is NOT redundant here: the system meets neither condition of the card.
test('promissory:iff a token put among another player\'s ships shows the warning standing', () => {
  const table = show(FAR);
  quote(table.pack, id, 'a non-home system that does not contain another player\'s ships');
  expectShownStanding(PLACE);
});

// Checks: the token put into the empty system NEAR shows no such warning.
// Why the check is redundant here: NEAR is a non-home system without other players' ships.
test('promissory:iff a token put into an empty system shows no warning of its place', () => {
  show(NEAR);
  expectNotShown(PLACE);
});
