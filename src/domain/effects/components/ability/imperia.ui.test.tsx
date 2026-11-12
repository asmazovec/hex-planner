import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, NEAR, quote, tactical } from '../kit';
import { id } from './imperia';

uiBench();

const table = (faction: string) => {
  const move = tactical(NEAR);
  return {
    move,
    table: bench({
      faction, expansions: ['pok'], entries: [move],
      game: { opponents: [{ id: 'sol1', faction: 'sol', vp: 0, seat: 2, color: 2 }], start: { me: {}, opponents: { sol1: { leaders: { 'leader:solcommander': 'unlocked' } } } } },
    }),
  };
};

// "While another player's command token is in your fleet pool, you can use the ability of that player's commander, if
//  it is unlocked."
// Checks: I name Claire Gibson, the Sol commander, in «Used»; it is written into the entry, and the warning that the
// component is not held reads as allowed by Imperia.
// Why the check is redundant here: the Mahact player may use another player's unlocked commander.
test('ability:imperia another player\'s commander is used, and the warning reads as allowed by Imperia', async () => {
  const mahact = table('mahact');
  quote(mahact.table.pack, id, 'you can use the ability of that player\'s commander, if it is unlocked');
  const live = showUses(mahact.table, mahact.move);
  await use('Claire Gibson');
  expect(live.entry().uses).toEqual(['leader:solcommander']);
  expectShownWaived('componentNotHeld', 'Imperia');
});

// LRR 22.1: a player plays the components they hold.
// Checks: another faction can name the commander too, and its warning stands.
// Why the check is NOT redundant here: Imperia is printed on the Mahact sheet.
test('ability:imperia another faction names the commander, and the warning stands', async () => {
  const letnev = table('letnev');
  const live = showUses(letnev.table, letnev.move);
  await use('Claire Gibson');
  expect(live.entry().uses).toEqual(['leader:solcommander']);
  expectShownStanding('componentNotHeld');
});
