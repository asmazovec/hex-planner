import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { EntryBody } from '../../../types';
import { adjust, bench, planned, quote } from '../kit';
import { id } from './quash';

uiBench();

const quash = () => planned({ type: 'component', componentId: id, note: '' } as EntryBody, 'agenda');

// "You may spend 1 token from your strategy pool to discard that agenda"
// Checks: Quash entered in the agenda phase with the strategy pool empty shows that no strategy token is left.
// Why the check is NOT redundant here: the token is Quash's price, and the planner shows the pool it is spent from.
test.fails('ability:quash with an empty strategy pool shows that no token is left', () => {
  const use = quash();
  const xxcha = bench({ faction: 'xxcha', entries: [adjust({ strategy: -2 }), use] });
  quote(xxcha.pack, id, 'You may spend 1 token from your strategy pool');
  showWarnings(xxcha, use);
  expectShownStanding('shortStrategy');
});

// Checks: with tokens in the pool nothing is shown about it.
test('ability:quash with tokens in the pool shows no warning of it', () => {
  const use = quash();
  showWarnings(bench({ faction: 'xxcha', entries: [use] }), use);
  expectNotShown('shortStrategy');
});
