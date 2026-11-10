/** LRR 26 Cost. Source: tirules2 rules-reference/cost.md. */
import { describe, expect, test } from 'vitest';
import { emptyHoldings } from '../../holdings';
import { loadPack } from '../../../data/loadPack';
import { CARD } from '../../strategy';
import { productionCost } from '../../unitStats';
import { adjust, codesOf, FACTION, HOME, primary, rulesGame, rulesPack, tactical } from '../kit';

const pack = rulesPack();
const cost = (units: Parameters<typeof productionCost>[0]) => productionCost(units, FACTION, emptyHoldings(), pack);
const atHome = { docks: ['h1'] };

describe('LRR 26 Cost', () => {
  test('26.1: producing a unit asks for at least its cost; paying exactly that is enough', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h2'], tradeGoods: 1 } });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 1 }, 'strategy'), build], game: atHome });
    expect(codesOf(game, pack, build)).toEqual([]);
  });

  test('26.1: paying more than the cost is allowed', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).not.toContain('shortResources');
  });

  test('26.1: paying less than the cost is warned about', () => {
    const build = tactical(HOME, { production: { dreadnought: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('shortResources');
  });

  test('26.2: a cost with two icons buys two units: two fighters cost what one costs', () => {
    expect(cost({ fighter: 2 })).toBe(1);
    expect(cost({ fighter: 1 })).toBe(1);
    expect(cost({ infantry: 4 })).toBe(2);
  });

  test('26.2: the pair is of one type: a fighter and an infantry are two costs', () => {
    expect(cost({ fighter: 1, infantry: 1 })).toBe(2);
  });

  test('26.3: every unit the base game lets a player produce has a cost', () => {
    const units = Object.values(loadPack([]).units);
    expect(units.length).toBeGreaterThan(0);
    for (const unit of units) expect(unit?.cost ?? 0).toBeGreaterThan(0);
  });

  test('26.3.1: structures have no cost: Construction places them without a payment', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'spacedock', planetId: 'h1' }, { kind: 'pds', planetId: 'h1' }] });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).not.toContain('shortResources');
  });

  test('26 note 1: a produced unit\'s cost is paid unless the effect says otherwise: an unpaid production is warned about', () => {
    const build = tactical(HOME, { production: { carrier: 1 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('shortResources');
  });

  test.todo('26 note 2: a deploy ability needs no unit cost, only its own — not modelled: deploy abilities are not planned');
});
