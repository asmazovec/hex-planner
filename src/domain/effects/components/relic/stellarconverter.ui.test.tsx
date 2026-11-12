import { expect, test } from 'vitest';
import { choose, expectShownStanding, showTurn, uiBench } from '../../../../ui/testing/effects';
import converterTarget from '../../../rules/codes/converterTarget';
import { bench, componentAction, endOf, NEAR, quote } from '../kit';
import { id } from './stellarconverter';

uiBench();

const TURN = componentAction(id);

const table = () => bench({
  faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries: [TURN], units: { [NEAR]: { dreadnought: 1 } },
  game: {
    opponents: [{ id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 }], enemyGround: { t1: { o1: { infantry: 2 } } },
    planetControl: { h1: 'me', h2: 'me', t1: 'enemy' }, planetOwner: { t1: 'o1' },
  },
});

// "destroy all units on that planet and purge its attachments and its planet card."
// Checks: in the editor of the action I choose Target One; the entry keeps the planet, and the plan leaves no unit and
// no controller on it.
// Why it is counted here: a play; the units and the control of the planet are the board's.
test('relic:stellarconverter the planet is chosen in the editor and destroyed', async () => {
  const converter = table();
  quote(converter.pack, id, 'destroy all units on that planet and purge its attachments and its planet card');
  const live = showTurn(converter, TURN);
  await choose('Target One');
  expect(live.entry().choices).toEqual({ planetId: 't1' });
  const end = endOf({ pack: converter.pack, game: live.game() });
  expect(end.rivals?.o1?.ground.t1 ?? {}).toEqual({});
  expect(end.control.t1).toBeUndefined();
});

// "Choose 1 non-home, non-legendary planet"
// Checks: Home One can be chosen all the same, and the warning that it is no target stands.
// Why the check is NOT redundant here: the card names the planets it may destroy, and a home planet is not one.
test('relic:stellarconverter a home planet can be chosen, and the warning stands', async () => {
  showTurn(table(), TURN);
  await choose('Home One');
  expectShownStanding(converterTarget.code);
});
