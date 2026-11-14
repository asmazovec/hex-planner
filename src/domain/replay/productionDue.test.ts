import { describe, expect, test } from 'vitest';
import { bench, before, tactical, using, warningsOf, type BenchOptions } from '../effects/components/kit';
import { HOME, NO_PAYMENT, primary } from '../rules/kit';
import { CARD } from '../strategy';
import { cardCost, repaid } from '../../testing/old/domain/strategy';
import { withProduction } from '../../testing/old/domain/tactical';
import type { Entry, UnitCounts } from '../types';
import { productionDue } from '../../testing/old/domain/replay/production';

/**
 * One cost for one production: the label of the editor, the counter of the shop, the automatic payment and the check
 * all ask `productionDue`. Each case compares it with what the check wants of an entry that pays nothing.
 */
const SARWEEN = 'technology:st';
const HERO = 'leader:hacanhero';
const GAME = { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } as const;

const needed = (options: BenchOptions, entry: Entry) => {
  const table = bench({ game: { ...GAME, planetControl: { ...GAME.planetControl } , docks: [...GAME.docks] }, ...options, entries: [entry] });
  const short = warningsOf(table, entry).find(w => w.code === 'shortResources');
  const units = (entry as { production: UnitCounts }).production;
  return { table, short: short ? (short.params.needed as number) : 0, due: productionDue(table.game, before(table.game, table.pack, entry), units, table.pack, entry) };
};

describe('one cost everywhere (productionDue)', () => {
  const buy: UnitCounts = { cruiser: 2, fighter: 1 };

  // Sarween Tools: "reduce the combined cost of the produced units by 1."
  test('Sarween Tools: the due cost is the checked one (cruiser x2 + fighter = 5 - 1)', () => {
    const { short, due } = needed({ faction: 'letnev', start: { technologies: [SARWEEN] } }, tactical(HOME, { production: buy, payment: NO_PAYMENT }));
    expect(due).toBe(4);
    expect(short).toBe(due);
  });

  test('no reduction held: the printed sum is both the due and the checked cost', () => {
    const { short, due } = needed({ faction: 'letnev' }, tactical(HOME, { production: buy, payment: NO_PAYMENT }));
    expect(due).toBe(5);
    expect(short).toBe(due);
  });

  test('a hero named in Used that makes units free: the due cost is the checked one', () => {
    const entry = using(tactical(HOME, { production: { flagship: 1, mech: 2 }, payment: NO_PAYMENT }), HERO);
    const { short, due } = needed({ faction: 'hacan', expansions: ['pok'], start: { technologies: [SARWEEN], leaders: { [HERO]: 'unlocked' } } }, entry);
    expect(short).toBe(due);
  });

  test('the automatic payment of a built unit pays the due cost, not the printed sum', () => {
    const table = bench({ faction: 'letnev', start: { technologies: [SARWEEN] }, game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } });
    const entry = tactical(HOME, { production: { cruiser: 1 }, payment: NO_PAYMENT }) as Extract<Entry, { type: 'tactical' }>;
    const state = before(table.game, table.pack, entry);
    const patch = withProduction(entry, state, 'letnev', 'cruiser', null, 1, table.pack, false, table.game);
    // two cruisers cost 4 printed, 3 with Sarween Tools: the best planet is enough, not both
    expect(patch.payment?.planets.length).toBe(1);
  });

  test('a card that produces: cardCost with the board is the checked cost', () => {
    const card = primary(CARD.warfare, { production: { systemId: HOME, units: buy }, payment: NO_PAYMENT });
    const table = bench({ faction: 'letnev', start: { technologies: [SARWEEN] }, entries: [card], game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } });
    const state = before(table.game, table.pack, card);
    const cost = cardCost(card as never, 'letnev', state.holdings, table.pack, { game: table.game, state });
    const short = warningsOf(table, card).find(w => w.code === 'shortResources');
    expect(short?.params.needed).toBe(cost.amount);
  });

  // L1Z1X Inheritance Systems: "spend 2 resources when you research a technology": naming it raises the price of the research.
  test('a used component that raises the price pays anew unless the payment was chosen by hand', () => {
    const card = primary(CARD.technology, { researched: ['technology:fl'], payment: { planets: ['h1'], tradeGoods: 0 } });
    const table = bench({ faction: 'l1z1x', start: { technologies: ['technology:is'] }, entries: [card], game: { planetControl: { h1: 'me', h2: 'me' } } });
    const state = before(table.game, table.pack, card);
    const auto = repaid(card, { uses: ['technology:is'] }, state, table.game, table.pack, false) as { effects?: { payment?: { planets: string[] } } };
    expect(auto.effects?.payment?.planets.length).toBeGreaterThan(0);
    expect(repaid(card, { uses: ['technology:is'] }, state, table.game, table.pack, true)).toEqual({ uses: ['technology:is'] });
  });
});
