/** LRR 22 Component Action. Source: tirules2 rules-reference/component-action.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import type { Entry } from '../../../testing/old/domain/types';
import { codesOf, forecast, rulesGame, rulesPack, rulesOf } from '../kit';

const pack = rulesPack();
const pok = loadPack(['pok']);
const action = (id: string, componentId?: string): Entry => ({ id, phase: 'action', status: 'planned', type: 'component', note: '', componentId });

describe('LRR 22 Component Action', () => {
  test('22.1: a component action names its component: an action card, a technology, a leader, a relic, a note, an ability of the sheet', () => {
    const held = { technologies: ['technology:gls'], hand: ['actionCard:bribery'], relics: ['relic:nanoforge'], leaders: { 'leader:solagent': 'unlocked' as const } };
    const entries = [action('c1', 'actionCard:bribery'), action('c2', 'technology:gls'), action('c3', 'leader:solagent'), action('c4', 'relic:nanoforge'), action('c5', 'ability:orbital_drop')];
    const game = rulesGame({ entries, game: { start: { me: held, opponents: {} } } });
    for (const entry of entries) expect(codesOf(game, pok, entry)).toEqual([]);
  });
  test('22.1: a component the player does not hold is a componentNotHeld; the action is still counted', () => {
    const play = action('c1', 'actionCard:bribery');
    const game = rulesGame({ entries: [play] });
    expect(codesOf(game, pack, play)).toEqual(['componentNotHeld']);
    expect(rulesOf(game, pack, play)).toEqual(['22.1']);
  });
  test('22.2: a component action without a component is planned as a note; what it does reaches the counts only through adjustments', () => {
    const component: Entry = { id: 'c1', phase: 'action', status: 'planned', type: 'component', note: 'some action' };
    const plain = forecast(rulesGame(), pack).state;
    expect(forecast(rulesGame({ entries: [component] }), pack).state).toEqual(plain);
  });
  test.todo('22.3: a component action that cannot resolve completely cannot be performed — not modelled: component texts are not read');
  test.todo('22.4: a cancelled component action does not use the action — not modelled: actions per turn are not counted');
  test.todo('22 note 1: action cards without the Action header are no component actions — not modelled: action cards are not in the data');
});
