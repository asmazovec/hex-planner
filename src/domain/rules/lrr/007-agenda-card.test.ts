/**
 * LRR 7 Agenda Card. Source: tirules2 rules-reference/agenda-card.md. Votes and outcomes are not modelled: an entry of
 * the agenda phase names the agenda that was resolved, and a law among them stays in play for the whole game.
 */
import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../testing/old/domain/types';
import { forecast, rulesGame, rulesPack } from '../kit';

const pack = rulesPack();
const LAW = 'agenda:revolution';
const DIRECTIVE = 'agenda:arms_reduction';
const agenda = (id: string, patch: Partial<Entry> = {}): Entry =>
  ({ id, phase: 'agenda', status: 'planned', type: 'adjustment', label: '', delta: {}, ...patch } as Entry);
const lawsAfter = (entries: Entry[]) => forecast(rulesGame({ entries }), pack).state.laws ?? [];

describe('LRR 7 Agenda Card', () => {
  test.todo('7.1: agendas are laws or directives — not modelled: agendas are not');
  test.todo('7.2: laws can change the rules for good — not modelled: agendas are not');
  test.todo('7.3: a law passed "For" or by election stays in play, in the common area or a player\'s — not modelled: agendas are not');
  test.todo('7.4: a law in a player\'s play area is owned by that player — not modelled: agendas are not');
  test('7.5: a discarded law is in play no more', () => {
    expect(lawsAfter([agenda('a', { gains: [LAW] }), agenda('b', { spends: [LAW] })])).toEqual([]);
  });
  test.todo('7.6: a law voted "Against" is resolved and discarded — not modelled: agendas are not');
  test.todo('7.7: directives have one-time effects — not modelled: agendas are not');
  test('7.8: a directive is resolved and discarded: it leaves no law in play', () => {
    expect(pack.components.find(c => c.id === DIRECTIVE)?.detail?.type).toBe('directive');
    expect(lawsAfter([agenda('a', { gains: [DIRECTIVE] })])).toEqual([]);
  });
  test.todo('7 note 1: the Politics player cannot show the agendas they looked at — not modelled: Politics is shown only');
  test.todo('7 note 2: an outcome affecting several players goes in speaker order — not modelled: agendas are not');
  test.todo('7 note 3: points to the notes on single agendas — nothing to test');
});
