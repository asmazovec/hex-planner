import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, NEAR, quote, tactical, using } from '../kit';
import { id } from './yssaril_mech';

const STALL = 'ability:stall_tactics';
const CARD = 'actionCard:abs';
/** The Stall Tactics component action that names the mech in `uses`, with the planet it goes to. */
const stall = (planet: string): Entry => componentAction(STALL, { spends: [CARD], uses: [id], choices: { planet } });
const table = (entry: Entry) => bench({ faction: 'yssaril', expansions: ['pok'], start: { hand: [CARD] }, entries: [entry] });

describe('mech:yssaril_mech Blackshade Infiltrator', () => {
  // "DEPLOY: After you use your Stall Tactics faction ability, you may place 1 mech on a planet you control."
  // Checks: after Stall Tactics a mech from the reinforcements stands on Home One.
  // Why the check is redundant here: a mech otherwise enters the board only by production (67, 68.3); the deploy
  // places it without a unit with Production, a cost or an activation.
  test('mech:yssaril_mech after Stall Tactics a mech is placed on a planet the Yssaril control', () => {
    const t = table(stall('h1'));
    quote(t.pack, id, 'After you use your Stall Tactics faction ability, you may place 1 mech on a planet you control.');
    expect(endOf(t).ground.h1?.mech).toBe(1);
  });

  // Checks: a planet the Yssaril do not control gets no mech.
  // Why the check is NOT redundant here: "a planet you control" is the card's own limit.
  test('mech:yssaril_mech places nothing on a planet the Yssaril do not control', () => {
    expect(endOf(table(stall('t1'))).ground.t1?.mech ?? 0).toBe(0);
  });

  // Checks: named in a tactical action, without Stall Tactics, the mech places nothing.
  // Why the check is NOT redundant here: the deploy follows Stall Tactics and nothing else.
  test('mech:yssaril_mech without Stall Tactics places nothing', () => {
    const t = table(using(tactical(NEAR), id));
    expect(endOf(t).ground.h1?.mech ?? 0).toBe(0);
  });

  test('mech:yssaril_mech is a play effect', () => {
    const { pack } = table(stall('h1'));
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
