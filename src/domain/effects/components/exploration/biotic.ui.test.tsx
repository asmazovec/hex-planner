import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { EntryBody } from '../../../types';
import { bench, NEAR, planned, quote, TARGET, tactical } from '../kit';
import { id } from './biotic';

uiBench();

const table = (gains: string[]) => {
  const take = tactical(TARGET, {
    moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
  }, gains.length > 0 ? { gains } : {});
  const claim = planned({ type: 'component', note: '', acts: [{ kind: 'expedition', sliceId: 'tech', payment: { planets: ['t1'], tradeGoods: 0 } }] } as EntryBody);
  return { claim, take, ...bench({ faction: 'letnev', expansions: ['pok', 'te'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[take], [claim]] }) };
};

// "This planet has a green technology specialty." LRR 35.2: the explorer draws and resolves a card of the planet's deck.
// Checks: in «Taken and discarded» of the landing that gains Target One the player takes the Biotic Research Facility.
// Why the check is redundant here: nothing is lifted; the choice must offer an exploration card drawn with a planet.
test.fails('exploration:biotic is taken in «Taken and discarded» of the entry that explores the planet', async () => {
  const facility = table([]);
  quote(facility.pack, id, 'This planet has a green technology specialty.');
  useGame.setState({ game: facility.game });
  const onChange = vi.fn();
  render(<GainsBlock entry={facility.take} pack={facility.pack} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Biotic Research Facility');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Biotic Research Facility' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

// Checks: with the card on Target One the technology part of the next round's expedition is shown as paid.
// Why the check is redundant here: Target One has the specialty the part asks for.
test.fails('exploration:biotic attached, the technology part paid with its planet shows no warning', () => {
  const facility = table([id]);
  showWarnings(facility, facility.claim);
  expectNotShown('expeditionUnpaid');
});

// Checks: without the card the same expedition is shown unpaid.
// Why the check is NOT redundant here: Target One has no specialty.
test('exploration:biotic not explored, the technology part paid with a planet without a specialty is shown unpaid', () => {
  const plain = table([]);
  showWarnings(plain, plain.claim);
  expectShownStanding('expeditionUnpaid');
});
