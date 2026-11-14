import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './deadly_plot';

describe('actionCard:deadly_plot Deadly Plot', () => {
  // "If you voted for or predicted another outcome, discard the agenda instead. The agenda is resolved with no effect
  //  and it is not replaced. Then, exhaust all of your planets."
  // Checks: the card is a hint with no step and lifts nothing.
  // Why nothing is validated here: the plan does not resolve agendas, and the planets it exhausts ready again at the
  // end of the agenda phase (Exhausted, note 1), before any entry of the next action phase can spend them.
  test('actionCard:deadly_plot is a hint with no step: agendas are not resolved by the plan', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'The agenda is resolved with no effect and it is not replaced. Then, exhaust all of your planets.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id });
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
