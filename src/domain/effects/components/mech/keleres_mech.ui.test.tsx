import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, land, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { Opponent } from '../../../types';
import { bench, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './keleres_mech';

uiBench();

const table = (rival: string) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1, infantry: 2 }, via: [NEAR] }] });
  const opponent: Opponent = { id: 'o1', faction: rival, vp: 0, seat: 2, color: 2 };
  return {
    move,
    ...bench({
      faction: 'letnev', expansions: ['pok'], units: { [HOME]: { carrier: 1, infantry: 2 } }, entries: [move],
      game: { opponents: [opponent], enemyGround: { t1: { o1: { mech: 1 } } }, planetControl: { t1: 'enemy' }, planetOwner: { t1: 'o1' } },
    }),
  };
};

// "Other players must spend 1 influence to commit ground forces to the planet that contains this unit."
// Checks: in the landing of the tactical editor I land an infantry on Target One, where a Keleres mech stands; the
// landing is taken, and the influence it owes is shown as a warning that stands.
// Why the check is not lifted: the mech imposes the cost; nothing of mine pays it, and the plan records no influence
// spent on a landing, so it can only remind of it.
test('mech:keleres_mech landing on its planet is taken and the influence owed is shown', async () => {
  const { move, ...keleres } = table('keleresm');
  quote(keleres.pack, id, 'must spend 1 influence to commit ground forces');
  const live = showTactical(keleres, move);
  await land('Infantry', 'Target One');
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: { infantry: 1 } }]);
  expectShownStanding('shortInfluence');
});

// Checks: the same landing beside another faction's mech shows no such warning.
// Why the check is NOT redundant here: only the Keleres mech imposes the cost.
test('mech:keleres_mech another faction\'s mech: the landing owes no influence', async () => {
  const { move, ...sol } = table('sol');
  showTactical(sol, move);
  await land('Infantry', 'Target One');
  expectNotShown('shortInfluence');
});
