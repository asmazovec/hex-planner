import { expect, test } from 'vitest';
import { choose, expectShownStanding, showTurn, uiBench } from '../../../../ui/testing/effects';
import attachTarget from '../../../rules/codes/attachTarget';
import { bench, componentAction, endOf, quote } from '../kit';
import { id } from './nanoforge';

uiBench();

const TURN = componentAction(id);

const table = () => bench({
  faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries: [TURN],
  game: { planetControl: { h1: 'me', h2: 'me', t1: 'me' } },
});

// "Attach this card to a non-legendary, non-home planet you control, its resource and influence values are increased
//  by 2"
// Checks: in the editor of the action I choose Target One; the entry keeps the planet and the Nano-Forge lies among
// its attachments.
// Why it is counted here: a play; the attachments are the board's, and the planet's values are a modify.
test('relic:nanoforge the planet is chosen in the editor and the relic is attached to it', async () => {
  const forge = table();
  quote(forge.pack, id, 'its resource and influence values are increased by 2');
  const live = showTurn(forge, TURN);
  await choose('Target One');
  expect(live.entry().choices).toEqual({ planetId: 't1' });
  expect(endOf({ pack: forge.pack, game: live.game() }).attachments?.t1 ?? []).toContain(id);
});

// "... non-home planet ..."
// Checks: Home One can be chosen all the same, and the warning that the card cannot be attached there stands.
// Why the check is NOT redundant here: the card excludes home planets.
test('relic:nanoforge a home planet can be chosen, and the warning stands', async () => {
  showTurn(table(), TURN);
  await choose('Home One');
  expectShownStanding(attachTarget.code);
});
