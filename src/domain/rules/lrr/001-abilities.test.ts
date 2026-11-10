/** LRR 1 Abilities. Source: tirules2 rules-reference/abilities.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { unitStats } from '../../unitStats';
import type { Entry } from '../../types';
import { adjust, codesOf, FACTION, forecast, HOME, NEAR, primary, rulesGame, rulesPack, secondary, tactical, TARGET } from '../kit';

const pack = rulesPack();

describe('LRR 1 Abilities', () => {
  test.todo('1.1: the Rules Reference wins over the Learn to Play booklet — not modelled: a matter of which document to read');

  test('1.2: a card may override the rules, so an action the rules warn about still takes its full effect', () => {
    // A carrier moves 1: two systems away is beyond it, yet a card could allow it, so the move happens and is only warned about.
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('speedShort');
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ carrier: 1 });
  });

  test('1.2: what a card changes is entered as an adjustment, which the replay applies as written', () => {
    const { state } = forecast(rulesGame({ entries: [adjust({ tactic: 1, tradeGoods: 2 })] }), pack);
    expect([state.tactic, state.tradeGoods]).toEqual([4, 2]);
  });

  test.todo('1.3: each ability says when and how it is resolved — not modelled: abilities are shown, not resolved');
  test.todo('1.3.1: an effect with a duration lasts even if its source goes — not modelled: durations are not tracked');
  test.todo('1.4: each ability of a card is its own paragraph — not modelled: print');

  test('1.5: an ability marked "Action" takes a component action: it is recorded as an action of its own, which spends no command token', () => {
    const component: Entry = { id: 'component', phase: 'action', status: 'planned', type: 'component', note: 'an action card' };
    const game = rulesGame({ entries: [component] });
    const { state } = forecast(game, pack);
    expect([state.tactic, state.fleet, state.strategy]).toEqual([3, 3, 2]);
    expect(codesOf(game, pack, component)).toEqual([]);
  });

  test.todo('1.6: "cannot" is absolute — not modelled: abilities are not resolved, and warnings never forbid');
  test.todo('1.6.1: between two "cannot" abilities, persistent beats one-time and enabling beats cancelling — not modelled: abilities are not resolved');
  test.todo('1.7: an ability is resolved in full, its "may" parts are optional — not modelled: abilities are not resolved');
  test.todo('1.8: abilities of components in play are mandatory unless they say "may" — not modelled: abilities are not resolved');
  test.todo('1.9: effects joined by "and" are resolved as far as possible — not modelled: abilities are not resolved');
  test.todo('1.10: heading of the costs rules — nothing to test');

  test('1.11: an effect cannot be resolved without its cost: Leadership\'s bought tokens without the influence are warned about', () => {
    const card = primary(CARD.leadership, { tokens: { tactic: 4 }, boughtTokens: 1 });
    expect(codesOf(rulesGame({ entries: [card] }), pack, card)).toContain('shortInfluence');
  });

  test('1.12: spending trade goods and command tokens are costs: the Technology secondary takes four of them and a strategy token', () => {
    const card = secondary(CARD.technology, { researched: ['technology:st'], payment: { planets: [], tradeGoods: 4 } });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 4 }), card] });
    const { state } = forecast(game, pack);
    expect([state.tradeGoods, state.strategy]).toEqual([0, 1]);
    expect(codesOf(game, pack, card)).toEqual([]);
  });

  test.todo('1.13: heading of the timing rules — nothing to test');
  test.todo('1.14: "before" and "after" resolve right before or after the event — not modelled: timing windows are not, the plan is a list of entries');
  test.todo('1.14.1: an "after a ship is destroyed" ability resolves at once — not modelled: timing windows are not');
  test.todo('1.15: "when" resolves at the moment of the event — not modelled: timing windows are not');
  test.todo('1.15.1: a "when" ability usually changes or replaces the event — not modelled: timing windows are not');
  test.todo('1.16: "when" goes before "after" — not modelled: timing windows are not');
  test.todo('1.17: what follows "then" needs what precedes it — not modelled: abilities are not resolved');
  test.todo('1.18: an ability resolves once per occurrence of its timing event — not modelled: abilities are not resolved');
  test.todo('1.19: in the action phase abilities of one window go in initiative order from the active player — not modelled: turn order is not');
  test.todo('1.20: in the strategy and agenda phases they go clockwise from the speaker — not modelled: turn order is not');
  test.todo('1.21: heading of the component rules — nothing to test');
  test.todo('1.22: an action card\'s first paragraph gives its timing — not modelled: action cards are not');
  test.todo('1.23: a promissory note\'s first paragraph gives its timing — not modelled: promissory notes are not');
  test.todo('1.23.1: some promissory notes trigger when received — not modelled: promissory notes are not');
  test.todo('1.24: agenda abilities belong to outcomes resolved after the vote — not modelled: agendas are not');
  test.todo('1.25: factions have faction abilities and flagship abilities — not modelled: they are shown on the faction card only');

  test('1.26: unit abilities sit with a unit\'s attributes: the stats carry anti-fighter barrage, bombardment and sustain damage', () => {
    expect(unitStats(FACTION, 'destroyer', false, pack)?.barrage).toBeDefined();
    expect(unitStats(FACTION, 'dreadnought', false, pack)?.bombard).toBeDefined();
    expect(unitStats(FACTION, 'dreadnought', false, pack)?.sustain).toBe(true);
    expect(unitStats(FACTION, 'cruiser', false, pack)?.sustain).toBeUndefined();
  });

  test.todo('1.27: an effect using or granting a unit ability counts as a unit having it — not modelled: unit abilities are shown, not resolved');
  test.todo('1.27.1: so such effects combo with and are shut down like unit abilities — not modelled: unit abilities are not resolved');
  test.todo('1.28: "this system" and "this planet" mean the unit\'s own — not modelled: unit abilities are not resolved');
  test.todo('1 note 1: an ability may be used in the window it was gained; some check their condition on trigger, some on resolution — not modelled: abilities are not resolved');
  test.todo('1 note 2: one physical object resolves an ability once a window; each unit is its own object — not modelled: abilities are not resolved');
  test.todo('1 note 3: action cards of one name cannot be played in one window on the same thing — not modelled: action cards are not');
  test.todo('1 note 4: in the action phase abilities go one at a time in turn order from the active player, until all decline in a row — not modelled: turn order is not');
  test.todo('1 note 5: secondaries are resolved clockwise after the primary — not modelled: other players\' primaries are not planned');
  test.todo('1 note 6: start and end of turn abilities can be used on the turn a player passes — not modelled: abilities are not resolved');
  test.todo('1 note 7: all "when" abilities trigger before any "after" ones — not modelled: timing windows are not');
  test.todo('1 note 8: all "after" abilities trigger before any "before" ones of the next event — not modelled: timing windows are not');
});
