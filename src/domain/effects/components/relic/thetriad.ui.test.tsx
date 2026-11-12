import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { PaymentBlock } from '../../../../ui/plan/blocks/PaymentBlock';
import { stateBeforeEntry } from '../../../project';
import type { Entry } from '../../../types';
import { bench, HOME, NO_PAYMENT, quote, tactical } from '../kit';
import { id } from './thetriad';

uiBench();

const build = (planets: string[]): Entry => tactical(HOME, { production: { carrier: 1 }, payment: { planets, tradeGoods: 0 } });
const table = (entry: Entry, relics: string[] = [id]) =>
  bench({ faction: 'sol', expansions: ['te'], start: { relics }, entries: [entry], game: { docks: ['h1'] } });

// "This card can be readied and spent as if it were a planet card. Its resource and influence values are equal to 3
//  plus the number of different types of relic fragments you own."
// Checks: the manual choice of the payment offers The Triad beside the planets, worth 3, and pressing it puts it in
// the payment.
// Why the check is redundant here: the payment offers only ready planets I control; the Triad is spent as one.
test.fails('relic:thetriad is offered in the payment as a planet worth 3', async () => {
  const carrier = build([]);
  const triad = table(carrier);
  quote(triad.pack, id, 'spent as if it were a planet card');
  const onChange = vi.fn();
  render(
    <PaymentBlock
      need={3} payment={NO_PAYMENT} state={stateBeforeEntry(triad.game, triad.game.plans[0], carrier.id, triad.pack)} pack={triad.pack}
      manual onManual={() => undefined} onChange={onChange}
    />,
  );
  await userEvent.click(within(screen.getByRole('group', { name: 'Planets to pay with' })).getByRole('button', { name: 'The Triad 3' }));
  expect(onChange).toHaveBeenCalledWith({ planets: [id], tradeGoods: 0 });
});

// Checks: paid with the Triad, the entry's payment warning reads as allowed by The Triad.
// Why the check is redundant here: the Triad held is a planet card for the payment.
test.fails('relic:thetriad in a payment reads as allowed by The Triad', () => {
  const carrier = build([id]);
  showWarnings(table(carrier), carrier);
  expectShownWaived('planetNotControlled', 'The Triad');
});

// LRR 34 note 2: only planets the player controls are spent.
// Checks: without the relic the same payment shows its warning standing.
// Why the check is NOT redundant here: the card is not held.
test('relic:thetriad not held, naming it in a payment shows the warning standing', () => {
  const carrier = build([id]);
  showWarnings(table(carrier, []), carrier);
  expectShownStanding('planetNotControlled');
});
