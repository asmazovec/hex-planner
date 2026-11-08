/** LRR 27 Custodians Token. Source: tirules2 rules-reference/custodians-token.md. */
import { describe, expect, test } from 'vitest';
import { MECATOL_PLANET, MECATOL_TILE } from '../../mecatol';
import { codesOf, forecast, rulesGame, rulesPack, tactical } from '../kit';

const pack = rulesPack();
const MECATOL = '0,-1';

/** Infantry on a carrier in the Mecatol Rex system land on the planet, which no one has taken yet. */
function landing(payment = { planets: [] as string[], tradeGoods: 0 }) {
  const land = tactical(MECATOL, { landings: [{ planetId: MECATOL_PLANET, units: { infantry: 1 } }], payment });
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

  test('27.2: removing the custodians token to land on Mecatol Rex costs six influence: landing unpaid is warned about', () => {
    const { land, game } = landing();
    expect(codesOf(game, pack, land)).toContain('shortInfluence');
  });

  test.todo('27.2.1: the token cannot be removed by a player who cannot commit ground forces to the planet — not modelled: the custodians token is not tracked');

  test('27.3: removing the custodians token gains one victory point', () => {
    const { game } = landing();
    expect(forecast(game, pack).state.vp).toBe(1);
  });

  test.todo('27.4: from the round the token is removed on, every round has an agenda phase — not modelled: the agenda phase is always offered');
  test.todo('27 note 1: the custodians token is no attachment — not modelled: attachments are not in the data');
});
