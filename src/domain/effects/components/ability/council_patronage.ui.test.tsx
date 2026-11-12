import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry, Opponent } from '../../../types';
import { adjust, bench, HOME, NEAR, planned, quote } from '../kit';
import { id } from './council_patronage';

uiBench();

const NEIGHBOUR: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const giving = (): Entry => planned({ type: 'pass', acts: [{ kind: 'transaction', with: 'o1', give: { commodities: 2 }, get: {} }] }, 'action');
const table = (faction: string, deal: Entry) => bench({
  faction, expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [adjust({}, 'strategy'), deal],
  game: { opponents: [NEIGHBOUR], enemyUnits: { [NEAR]: { o1: { cruiser: 1 } } } },
});

// "At the start of the strategy phase: Replenish your commodities, then gain 1 trade good."
// Checks: the turn that gives 2 commodities to a neighbour in round 1 shows no warning of commodities missing.
// Why the check is redundant here: the Keleres replenished their commodities at the start of the round.
test('ability:council_patronage the Keleres trade their commodities in round 1 and no warning is shown', () => {
  const deal = giving();
  const keleres = table('keleresm', deal);
  quote(keleres.pack, id, 'Replenish your commodities, then gain 1 trade good.');
  showWarnings(keleres, deal);
  expectNotShown('shortCommodities');
});

// LRR 21.3: commodities come only from a replenish.
// Checks: the same turn of another faction shows the warning standing.
// Why the check is NOT redundant here: no replenish happened for that faction.
test('ability:council_patronage another faction giving commodities it has not got sees the warning', () => {
  const deal = giving();
  showWarnings(table('letnev', deal), deal);
  expectShownStanding('shortCommodities');
});
