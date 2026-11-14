import { expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import { expectShownStanding, expectShownWaived, showTurn, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { CardEffects } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, componentAction, FAR, quote, TARGET } from '../kit';
import { id } from './arborechero';

uiBench();

/** The hero's component action with a production: no editor writes `effects` yet, so the entry carries it as saved. */
const table = (effects: CardEffects) => {
  const play: Entry = componentAction(id, { effects } as Partial<Entry>);
  return { play, ...bench({
    faction: 'arborec', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } },
    entries: [adjust({ ground: { t1: { infantry: 1 } } }, 'strategy'), play], game: { planetControl: { t1: 'me' } },
  }) };
};

const PAID = { planets: ['h1', 'h2'], tradeGoods: 0 };

// "ACTION: Produce any number of units in any number of systems that contain 1 or more of your ground forces."
// Checks: a production of the hero in the target system, where only my infantry stands, shows the Production value beyond
// which the units exceed, as allowed by Letani Miasmiala.
// Why the check is redundant here: no unit uses PRODUCTION when the hero produces (Arborec, hero note 3).
test('leader:arborechero a production in a system with my ground forces reads as allowed by the hero', () => {
  const hero = table({ production: { systemId: TARGET, units: { cruiser: 1, infantry: 2 }, ground: { t1: { infantry: 2 } } }, payment: PAID });
  quote(hero.pack, id, 'Produce any number of units in any number of systems that contain 1 or more of your ground forces');
  showWarnings(hero, hero.play);
  expectShownWaived('productionOver', 'Letani Miasmiala');
});

// "... in any number of systems that contain 1 or more of your ground forces."
// Checks: a production in a system without my ground forces shows the warning standing.
// Why the check is NOT redundant here: the hero's own condition is not met.
test('leader:arborechero a production in a system without my ground forces is shown with a standing warning', () => {
  const hero = table({ production: { systemId: FAR, units: { cruiser: 1 } }, payment: PAID });
  showWarnings(hero, hero.play);
  expectShownStanding('noProduction');
});

// "ACTION: Produce any number of units in any number of systems that contain 1 or more of your ground forces."
// Checks: the component action of the hero shows a production block of its own: the button to choose the system until
// one is chosen, then the system with what is produced and the payment.
// Why: the hero's production is entered in its own editor, so its waivers can apply; a component that does not produce shows no block.
test('leader:arborechero the component action has a production block', () => {
  const empty = table({});
  showTurn(empty, empty.play);
  expect(screen.getByRole('button', { name: 'Choose a system to produce in' })).toBeTruthy();
  expect(screen.getByRole('group', { name: 'Production' })).toBeTruthy();
});

test('leader:arborechero the production chosen shows its system and its payment', () => {
  const hero = table({ production: { systemId: TARGET, units: { cruiser: 1, infantry: 2 }, ground: { t1: { infantry: 2 } } }, payment: PAID });
  showTurn(hero, hero.play);
  expect(screen.queryByRole('button', { name: 'Choose a system to produce in' })).toBeNull();
  expect(screen.getByRole('button', { name: /Cruiser/ })).toBeTruthy();
});
