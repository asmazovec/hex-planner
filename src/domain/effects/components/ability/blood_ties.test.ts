import { describe, expect, test } from 'vitest';
import { MECATOL_PLANET, MECATOL_TILE } from '../../../mecatol';
import { CARD } from '../../../replay/cards/ids';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, primary, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './blood_ties';

/** Mecatol Rex beside the home system. */
const MECATOL = '0,-1';
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', [MECATOL]: MECATOL_TILE };
const land = (landings = [{ planetId: MECATOL_PLANET, units: { infantry: 1 } }]) =>
  tactical(MECATOL, { moves: [{ from: HOME, units: { carrier: 1, infantry: 1 } }], landings });
const table = (faction: string, entries: Entry[]) =>
  bench({ faction, units: { [HOME]: { carrier: 1, infantry: 1 } }, entries, game: { map: MAP } });

describe('ability:blood_ties Blood Ties', () => {
  // "You do not have to spend influence to remove the custodians token from Mecatol Rex."
  // Checks: the Winnu land an infantry on Mecatol Rex with the custodians token on it; the warning of the token and
  // that of the six influence unpaid are both listed and lifted by the ability.
  // Why the check is redundant here: 54.1 asks six influence to remove the token, and the ability says the Winnu do
  // not spend it.
  test('ability:blood_ties the landing on Mecatol Rex needs no influence: custodians and its six influence are waived', () => {
    const move = land();
    const winnu = table('winnu', [move]);
    quote(winnu.pack, id, 'You do not have to spend influence to remove the custodians token from Mecatol Rex');
    const warnings = warningsOf(winnu, move);
    expectWaived(warnings, 'custodians', id);
    expectWaived(warnings, 'shortInfluence', id);
  });

  // LRR 54.1: "This token prevents a player from committing ground forces to land on the planet unless they spend six
  //  influence to remove the token."
  // Checks: another faction landing the same way is warned of both.
  // Why the check is NOT redundant here: the ability is the Winnu's own.
  test('ability:blood_ties is the Winnu\'s own: another faction is warned of the token and the influence', () => {
    const move = land();
    const warnings = warningsOf(table('sol', [move]), move);
    expectStanding(warnings, 'custodians');
    expectStanding(warnings, 'shortInfluence');
  });

  // LRR 27.3: "When a player removes the custodians token from Mecatol Rex, ... they gain one victory point."
  // Checks: the token is still removed by the landing, with its point.
  // Why nothing is waived here: the ability frees the price, not the removal; ruling (Blood Ties 1) the Winnu still
  // commit a ground force, which this landing does.
  test('ability:blood_ties the token is still removed by the landing and gains its victory point', () => {
    const end = endOf(table('winnu', [land()]));
    expect(end.custodiansRemoved).toBe(true);
    expect(end.vp).toBe(1);
  });

  // Checks: ships that only enter the Mecatol Rex system commit nothing, so nothing is warned of or waived.
  test('ability:blood_ties ships in the Mecatol Rex system alone make no warning at all', () => {
    const move = land([]);
    expectNone(warningsOf(table('winnu', [move]), move), 'custodians');
  });

  // LRR 18 (Leadership): influence buys command tokens.
  // Checks: influence the Winnu lack for anything else than the custodians token stays warned of.
  // Why the check is NOT redundant here: the ability speaks only of the influence that removes the custodians token.
  test('ability:blood_ties does not lift a lack of influence for anything else: Leadership\'s bought tokens stand', () => {
    const buy = primary(CARD.leadership, { boughtTokens: 1, tokens: { tactic: 4 } });
    expectStanding(warningsOf(table('winnu', [buy]), buy), 'shortInfluence');
  });

  test('ability:blood_ties is a passive effect that waives the custodians token and its influence', () => {
    const { pack } = table('winnu', []);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code).sort()).toEqual(['custodians', 'shortInfluence']);
  });
});
