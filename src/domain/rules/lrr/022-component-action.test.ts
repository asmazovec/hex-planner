/** LRR 22 Component Action. Source: tirules2 rules-reference/component-action.md. */
import { describe, expect, test } from 'vitest';
import type { Entry } from '../../types';
import { forecast, rulesGame, rulesPack } from '../kit';

const pack = rulesPack();

describe('LRR 22 Component Action', () => {
  test.todo('22.1: component actions come from cards, leaders, relics, notes and faction sheets — not modelled: the components are not in the data');
  test('22.2: a component action is planned as a note; what it does reaches the counts only through adjustments', () => {
    const component: Entry = { id: 'c1', phase: 'action', status: 'planned', type: 'component', note: 'some action' };
    const plain = forecast(rulesGame(), pack).state;
    expect(forecast(rulesGame({ entries: [component] }), pack).state).toEqual(plain);
  });
  test.todo('22.3: a component action that cannot resolve completely cannot be performed — not modelled: component texts are not read');
  test.todo('22.4: a cancelled component action does not use the action — not modelled: actions per turn are not counted');
  test.todo('22 note 1: action cards without the Action header are no component actions — not modelled: action cards are not in the data');
});
