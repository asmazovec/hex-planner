import { describe, expect, test } from 'vitest';
import type { ExtensionCode, UnitCounts } from '../../../types';
import { before, bench, componentAction, effect, endOf, expectNone, expectStanding, HOME, NEAR, quote, warningsOf } from '../kit';
import { id } from './avernus';

/** The warning that a component's own condition is not met (src/domain/rules/codes/componentCondition.ts in pass 2). */
const CONDITION = 'componentCondition' as ExtensionCode;

/** The Nucleus played to place `unit` in `system`. */
const nucleus = (unit: string, system: string) => componentAction(id, { choices: { unit, system } });
const table = (entries = [nucleus('destroyer', HOME)], { units = { warsun: 1 } as UnitCounts, control = true } = {}) =>
  bench({ faction: 'letnev', expansions: ['pok', 'te'], units: { [HOME]: units }, entries, game: { planetControl: control ? { avernus: 'me' } : {} } });

describe('legendary:avernus The Nucleus', () => {
  // "ACTION: Exhaust this card to use the Embers of Muaat's STAR FORGE faction ability without spending a command
  //  token."; Star Forge: "place either 2 fighters or 1 destroyer from your reinforcements in a system that contains 1
  //  or more of your war suns."
  // Checks: a Letnev player with a war sun at home plays the Nucleus: one destroyer is placed there and the strategy
  // pool keeps its tokens.
  // Why the cost does not apply: Star Forge spends a token from the strategy pool; the card uses it without one.
  test.fails('legendary:avernus places a destroyer beside a war sun and spends no strategy token', () => {
    const entry = nucleus('destroyer', HOME);
    const game = table([entry]);
    quote(game.pack, id, 'without spending a command token');
    const end = endOf(game);
    expect(end.systems[HOME]).toEqual({ warsun: 1, destroyer: 1 });
    expect(end.strategy).toBe(before(game.game, game.pack, entry).strategy);
    expect(end.holdings.exhausted).toContain(id);
    expectNone(warningsOf(game, entry), CONDITION);
  });

  // Star Forge: "... either 2 fighters or 1 destroyer ..."
  // Checks: the choice of fighters places two of them.
  test.fails('legendary:avernus the fighters choice places two fighters', () => {
    expect(endOf(table([nucleus('fighter', HOME)])).systems[HOME]).toEqual({ warsun: 1, fighter: 2 });
  });

  // Star Forge: "... in a system that contains 1 or more of your war suns."; Muaat notes, Avernus 3: "If another
  //  player controls Avernus, they may use The Nucleus only if they have a war sun on the game board."
  // Checks: a system without a war sun of mine is warned of.
  // Why the check is NOT redundant here: the card lifts the cost of Star Forge, not its condition.
  test.fails('legendary:avernus a system without my war sun is warned of', () => {
    const entry = nucleus('destroyer', NEAR);
    expectStanding(warningsOf(table([entry]), entry), CONDITION);
  });

  // Checks: with no war sun on the board at all the use is warned of.
  test.fails('legendary:avernus with no war sun on the board is warned of', () => {
    const entry = nucleus('destroyer', HOME);
    expectStanding(warningsOf(table([entry], { units: { carrier: 1 } }), entry), CONDITION);
  });

  // "ACTION: Exhaust this card ..."; LRR 34.4.
  // Checks: a second play in the round is warned of as exhausted.
  test('legendary:avernus played twice in a round is warned of as exhausted', () => {
    const second = nucleus('destroyer', HOME);
    expectStanding(warningsOf(table([nucleus('destroyer', HOME), second]), second), 'componentExhausted');
  });

  // LRR 53.3 with 53.2: the card is in the play area of the player who controls Avernus.
  test.fails('legendary:avernus played without controlling Avernus is warned of as not held', () => {
    const entry = nucleus('destroyer', HOME);
    expectStanding(warningsOf(table([entry], { control: false }), entry), 'componentNotHeld');
  });

  test.fails('legendary:avernus is a play effect', () => {
    const { pack } = table();
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
