import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../replay/cards/ids';
import { tech } from '../../../rules/kit';
import { bench, NEAR, quote, secondary, TARGET, tactical } from '../kit';
import { id } from './rw';
import { turnProps } from '../../../../ui/testing/turnProps';
import { kernelViewOf } from '../../../../ui/testing/view';

uiBench();

const landing = (gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, gains.length > 0 ? { gains } : {});
const research = () => secondary(CARD.technology, { researched: [tech('cruiser')], payment: { planets: ['t1', 'h2'], tradeGoods: 0 } });
const table = (gains: string[]) => {
  const pay = research();
  const take = landing(gains);
  return { pay, take, ...bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[take], [pay]] }) };
};

// "This planet's resource value is increased by 1." LRR 35.2: the explorer draws and resolves a card of the planet's deck.
// Checks: in «Taken and discarded» of the landing that gains Target One the player takes Rich World from the deck.
// Why the check is redundant here: nothing is lifted; the choice offers only what a player holds as a card today, and
// an exploration card drawn with a planet must be offered too.
test('exploration:rw is taken in «Taken and discarded» of the entry that explores the planet', async () => {
  const rich = table([]);
  quote(rich.pack, id, "This planet's resource value is increased by 1.");
  useGame.setState({ game: rich.game });
  const onChange = vi.fn();
  render(<GainsBlock {...turnProps(kernelViewOf(rich.game, rich.pack), rich.pack, rich.take, onChange)} pack={rich.pack}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Rich World');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Rich World' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

// Checks: with Rich World on Target One the payment of the next round shows no shortfall.
// Why the check is redundant here: Target One is worth 3 with the card, and 3 + 1 pays the four resources.
test('exploration:rw attached, the payment of the next round shows no resource shortfall', () => {
  const rich = table([id]);
  showWarnings(rich, rich.pay);
  expectNotShown('shortResources');
});

// Checks: without the card the same payment is shown one resource short.
// Why the check is NOT redundant here: nothing raises Target One.
test('exploration:rw not explored, the payment is shown one resource short', () => {
  const plain = table([]);
  showWarnings(plain, plain.pay);
  expectShownStanding('shortResources');
});
