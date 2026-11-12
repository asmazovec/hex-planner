import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, expectStanding, expectWaived, HOME, primary, quote, tactical, warningsOf } from '../kit';
import { id } from './xxchabt';

/** The home dock on h1 produces; h1 is 3 resources and 1 influence, h2 1 resource and 2 influence. */
const produce = (production: UnitCounts, planets: string[]) => tactical(HOME, { production, payment: { planets, tradeGoods: 0 } });
const table = (faction: string, entries: Entry[], held = true) =>
  bench({ faction, expansions: ['te'], start: held ? { breakthrough: 'held' } : {}, entries, game: { docks: ['h1'] } });

describe('breakthrough:xxchabt Archon\'s Gift', () => {
  // "You can spend influence as if it were resources."
  // Checks: a cruiser (cost 2) is paid with h2 alone, 1 resource and 2 influence; the warning that a resource falls
  // short is listed and lifted by the breakthrough.
  // Why the check is redundant here: h2 spent for its influence pays 2, the whole cost.
  test('breakthrough:xxchabt pays a production with a planet\'s influence: shortResources is waived', () => {
    const build = produce({ cruiser: 1 }, ['h2']);
    const xxcha = table('xxcha', [build]);
    quote(xxcha.pack, id, 'You can spend influence as if it were resources.');
    expectWaived(warningsOf(xxcha, build), 'shortResources', id);
  });

  // "You can spend resources as if it were influence."
  // Checks: Leadership's one token bought (3 influence) is paid with h1 alone, 3 resources and 1 influence; the
  // warning that influence falls short is listed and lifted.
  // Why the check is redundant here: h1 spent for its resources pays 3, the whole cost.
  test('breakthrough:xxchabt pays influence with a planet\'s resources: shortInfluence is waived', () => {
    const buy = primary(CARD.leadership, { boughtTokens: 1, tokens: { tactic: 4 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expectWaived(warningsOf(table('xxcha', [buy]), buy), 'shortInfluence', id);
  });

  // Ruling (Archon's Gift 1): "A source of both influence and resources, such as a planet, may be spent for one or the
  //  other, but not both."
  // Checks: two cruisers (cost 4) paid with h1 alone, 3 resources and 1 influence, still fall short.
  // Why the check is NOT redundant here: a planet is worth the greater of its values, never their sum.
  test('breakthrough:xxchabt a planet is spent for one value, not both: the shortfall stands', () => {
    const build = produce({ cruiser: 2 }, ['h1']);
    expectStanding(warningsOf(table('xxcha', [build]), build), 'shortResources');
  });

  // LRR 64 (Production): units are paid with resources.
  // Checks: another faction paying the same way is short.
  // Why the check is NOT redundant here: the breakthrough is the Xxcha's.
  test('breakthrough:xxchabt is the Xxcha\'s own: another faction paying with influence stands short', () => {
    const build = produce({ cruiser: 1 }, ['h2']);
    expectStanding(warningsOf(table('sol', [build]), build), 'shortResources');
  });

  // Checks: the breakthrough not yet held changes nothing.
  test('breakthrough:xxchabt not held, the shortfall stands', () => {
    const build = produce({ cruiser: 1 }, ['h2']);
    expectStanding(warningsOf(table('xxcha', [build], false), build), 'shortResources');
  });

  test('breakthrough:xxchabt is a passive effect that waives a payment short of either value', () => {
    const { pack } = table('xxcha', []);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code).sort()).toEqual(['shortInfluence', 'shortResources']);
  });
});
