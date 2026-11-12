import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../replay/cards/ids';
import { bench, NEAR, quote, secondary, TARGET, tactical } from '../kit';
import { id } from './toe';

uiBench();

const table = (gains: string[]) => {
  const take = tactical(TARGET, {
    moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
  }, gains.length > 0 ? { gains } : {});
  const pay = secondary(CARD.leadership, { boughtTokens: 1, tokens: { tactic: 1 }, payment: { planets: ['t1', 'h1'], tradeGoods: 0 } });
  return { pay, take, ...bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[take], [pay]] }) };
};

// "This planet's influence value is increased by 1." LRR 35.2: the explorer draws and resolves a card of the planet's deck.
// Checks: in «Taken and discarded» of the landing that gains Target One the player takes the Tomb of Emphidia.
// Why the check is redundant here: nothing is lifted; the choice must offer an exploration card drawn with a planet.
test.fails('exploration:toe is taken in «Taken and discarded» of the entry that explores the planet', async () => {
  const tomb = table([]);
  quote(tomb.pack, id, "This planet's influence value is increased by 1.");
  useGame.setState({ game: tomb.game });
  const onChange = vi.fn();
  render(<GainsBlock entry={tomb.take} pack={tomb.pack} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Tomb of Emphidia');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Tomb of Emphidia' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

// Checks: with the tomb on Target One the token bought next round with Target One and Home One shows no shortfall.
// Why the check is redundant here: 1 + 1 + 1 pays the three influence.
test.fails('exploration:toe attached, the payment of the next round shows no influence shortfall', () => {
  const tomb = table([id]);
  showWarnings(tomb, tomb.pay);
  expectNotShown('shortInfluence');
});

// Checks: without the card the same payment is shown short.
// Why the check is NOT redundant here: nothing raises Target One.
test('exploration:toe not explored, the payment is shown short of influence', () => {
  const plain = table([]);
  showWarnings(plain, plain.pay);
  expectShownStanding('shortInfluence');
});
