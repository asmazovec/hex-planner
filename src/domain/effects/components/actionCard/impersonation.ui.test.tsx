import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, componentAction, quote } from '../kit';
import { id } from './impersonation';

uiBench();

// "Spend 3 influence to draw 1 secret objective."
// Checks: the component action of the card, paid with 2 influence, shows the shortfall of influence in its warnings.
// Why the check is NOT redundant here: the card costs 3 influence; nothing lifts it. Pass 2 also gives the component
// action a payment block, where the player picks the planets.
test('actionCard:impersonation paid short, the shortfall of influence is shown', () => {
  const entry = { ...componentAction(id), payment: { planets: ['h2'], tradeGoods: 0 } } as Entry;
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] }, entries: [entry] });
  quote(table.pack, id, 'Spend 3 influence');
  showWarnings(table, entry);
  expectShownStanding('shortInfluence');
});
