import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode, Entry } from '../../../types';
import { adjust, bench, HOME, primary, quote } from '../kit';
import { id } from './minister_industry';

uiBench();

/** The check pass 2 adds: a card that produces nothing entered with a production (LRR 67.1). */
const CODE = 'productionNotAllowed' as AnyWarningCode;
const law = (): Entry => ({ ...adjust({}, 'strategy'), gains: [id] });

/** The warnings of Construction placing a space dock on Home Two and producing two fighters at home. */
const construction = (inPlay: boolean) => {
  const entry = primary(4, { structures: [{ kind: 'spacedock', planetId: 'h2' }], production: { systemId: HOME, units: { fighter: 2 } }, payment: { planets: ['h1'], tradeGoods: 0 } });
  const table = bench({ faction: 'sol', units: { [HOME]: { carrier: 1 } }, entries: inPlay ? [law(), entry] : [entry] });
  return { table, live: showWarnings(table, entry) };
};

// "When the owner of this card places a space dock in a system, their units in that system may use their
//  PRODUCTION abilities."
// Checks: the production stays in the Construction entry and its warning reads as allowed by Minister of Industry.
// Why the check is redundant here: the law lets the units of the dock's system produce when it is placed (67.1
// keeps production to the tactical action otherwise).
test('agenda:minister_industry a production on Construction reads as allowed by Minister of Industry', () => {
  const { table, live } = construction(true);
  quote(table.pack, id, 'their units in that system may use their PRODUCTION abilities');
  expect(live.entry()).toMatchObject({ effects: { production: { systemId: HOME, units: { fighter: 2 } } } });
  expectShownWaived(CODE, 'Minister of Industry');
});

// LRR 67.1: production belongs to the production step of a tactical action.
// Checks: without the law the warning stands on the screen.
// Why the check is NOT redundant here: the law is not in play.
test('agenda:minister_industry without the law a production on Construction stands', () => {
  construction(false);
  expectShownStanding(CODE);
});
