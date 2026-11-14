import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, primary, quote } from '../kit';
import { id } from './minister_sciences';

uiBench();

const law = (): Entry => ({ ...adjust({}, 'strategy'), gains: [id] });

/** Technology's primary with two technologies and nothing paid, with the law or without. */
const technology = (inPlay: boolean) => {
  const entry = primary(7, { researched: ['technology:gd', 'technology:amd'] });
  const table = bench({ faction: 'sol', entries: inPlay ? [law(), entry] : [entry] });
  return { table, live: showWarnings(table, entry) };
};

// "When the owner of this card resolves the primary or secondary ability of the "Technology" strategy card, they do
//  not need to spend resources to research technology."
// Checks: the two technologies stay researched with nothing paid, and the shortfall reads as allowed by Minister of
// Sciences.
// Why the check is redundant here: the 6 resources of the second technology (91.2) are not owed by the law's owner.
test('agenda:minister_sciences two technologies researched for nothing, and the shortfall reads as allowed by Minister of Sciences', () => {
  const { table, live } = technology(true);
  quote(table.pack, id, 'they do not need to spend resources to research technology');
  expect(live.entry()).toMatchObject({ effects: { researched: ['technology:gd', 'technology:amd'] } });
  expectShownWaived('shortResources', 'Minister of Sciences');
});

// LRR 91.2: "the active player may research one additional technology by spending 6 resources."
// Checks: without the law the shortfall stands on the screen.
// Why the check is NOT redundant here: the law is not in play.
test('agenda:minister_sciences without the law the shortfall of Technology stands', () => {
  technology(false);
  expectShownStanding('shortResources');
});
