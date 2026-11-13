/** LRR 27 Custodians Token. Source: tirules2 rules-reference/custodians-token.md. */
import { describe, expect, test } from 'vitest';
import { MECATOL_PLANET, MECATOL_TILE } from '../../mecatol';
import { adjust, codesOf, forecast, rulesGame, rulesPack, tactical } from '../kit';

const pack = rulesPack();
const MECATOL = '0,-1';

/** Infantry on a carrier in the Mecatol Rex system land on the planet, which no one has taken yet. */
function landing(custodiansPayment?: { planets: string[]; tradeGoods: number }) {
  const land = tactical(MECATOL, { landings: [{ planetId: MECATOL_PLANET, units: { infantry: 1 } }], custodiansPayment });
  const game = rulesGame({
    map: { ...rulesGame().map, [MECATOL]: MECATOL_TILE },
    units: { [MECATOL]: { carrier: 1, infantry: 1 } },
    entries: [land],
  });
  return { land, game };
}

describe('LRR 27 Custodians Token', () => {
  test('27.1: ships move into the Mecatol Rex system by the normal rules', () => {
    const move = tactical(MECATOL, { moves: [{ from: '0,0', units: { cruiser: 1 } }] });
    const game = rulesGame({ map: { ...rulesGame().map, [MECATOL]: MECATOL_TILE }, units: { '0,0': { cruiser: 1 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toEqual([]);
  });

  test('27.2: removing the custodians token to land on Mecatol Rex costs six influence: landing unpaid gives one warning', () => {
    const { land, game } = landing();
    expect(codesOf(game, pack, land)).toEqual(['custodians']);
  });

  test('27.2: six influence paid (planets and trade goods) remove the token: no warning, the planets exhausted, the goods spent', () => {
    const pay = adjust({ tradeGoods: 4 });
    const { land } = landing({ planets: ['h2'], tradeGoods: 4 });
    const game = rulesGame({
      map: { ...rulesGame().map, [MECATOL]: MECATOL_TILE },
      units: { [MECATOL]: { carrier: 1, infantry: 1 } },
      entries: [pay, land],
    });
    expect(codesOf(game, pack, land)).toEqual([]);
    const { state } = forecast(game, pack);
    expect(state.exhausted).toContain('h2');
    expect(state.tradeGoods).toBe(0);
    expect(state.vp).toBe(1);
    expect(state.custodiansRemoved).toBe(true);
  });

  test('27.2: a payment short of six influence warns once, with what was paid', () => {
    const { land, game } = landing({ planets: ['h2'], tradeGoods: 0 });
    const found = forecast(game, pack).warnings[land.id] ?? [];
    expect(found.map(w => w.code)).toEqual(['custodians']);
    expect(found[0].params).toMatchObject({ needed: 6, paid: 2 });
  });

  test('27.2: once removed, the token stays gone: a later landing on Mecatol Rex costs nothing', () => {
    const first = tactical(MECATOL, { landings: [{ planetId: MECATOL_PLANET, units: { infantry: 1 } }] });
    const second = tactical(MECATOL, { landings: [{ planetId: MECATOL_PLANET, units: { infantry: 1 } }] });
    const game = rulesGame({ map: { ...rulesGame().map, [MECATOL]: MECATOL_TILE }, units: { [MECATOL]: { carrier: 1, infantry: 2 } }, entries: [first, second] });
    expect(codesOf(game, pack, second)).not.toContain('custodians');
    expect(forecast(game, pack).state.vp).toBe(1);
  });

  test('27.2: a rival landing on Mecatol Rex removes the token for me too: my later landing is not warned, the point is theirs', () => {
    const rival = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };
    const theirs = tactical(MECATOL, { landings: [{ planetId: MECATOL_PLANET, units: { infantry: 1 } }] }, { owner: rival.id });
    const mine = tactical(MECATOL, { landings: [{ planetId: MECATOL_PLANET, units: { infantry: 1 } }] });
    const game = rulesGame({
      map: { ...rulesGame().map, [MECATOL]: MECATOL_TILE }, units: { [MECATOL]: { carrier: 1, infantry: 1 } },
      entries: [theirs, mine], game: { opponents: [rival], enemyUnits: { [MECATOL]: { o1: { infantry: 1 } } } },
    });
    expect(codesOf(game, pack, mine)).not.toContain('custodians');
    expect(forecast(game, pack).state.vp).toBe(0);
  });

  test.todo('27.2.1: the token cannot be removed by a player who cannot commit ground forces to the planet — not modelled: the custodians token is not tracked');

  test('27.3: removing the custodians token gains one victory point', () => {
    const { game } = landing();
    expect(forecast(game, pack).state.vp).toBe(1);
  });

  test.todo('27.4: from the round the token is removed on, every round has an agenda phase — not modelled: the agenda phase is always offered');
  test.todo('27 note 1: the custodians token is no attachment — not modelled: attachments are not in the data');
});
