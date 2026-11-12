import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode, Entry, UnitCounts } from '../../../types';
import { bench, componentAction, FARTHER, quote } from '../kit';
import { id } from './plagiarize';

uiBench();

// "Spend 5 influence and choose a non-faction technology owned by 1 of your neighbors."
// Checks: the component action that copies from a player standing far from me shows the warning of the card, and with
// no payment the shortfall of influence too.
// Why the check is NOT redundant here: the card reaches only a neighbour's technologies and costs 5 influence; nothing
// lifts either.
test('actionCard:plagiarize a technology of a player who is not a neighbour shows the warning of the card', () => {
  const entry = { ...componentAction(id, {}), choices: { technology: 'technology:gd', from: 'o1' }, payment: { planets: ['h2'], tradeGoods: 0 } } as Entry;
  const table = bench({
    faction: 'sol', expansions: ['pok'], entries: [entry],
    game: {
      start: { me: { hand: [id] }, opponents: { o1: { technologies: ['technology:gd'] } } },
      opponents: [{ id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 }],
      enemyUnits: { [FARTHER]: { o1: { destroyer: 1 } as UnitCounts } },
    },
  });
  quote(table.pack, id, 'choose a non-faction technology owned by 1 of your neighbors');
  showWarnings(table, entry);
  expectShownStanding('techNotFromNeighbor' as AnyWarningCode);
  expectShownStanding('shortInfluence');
});
