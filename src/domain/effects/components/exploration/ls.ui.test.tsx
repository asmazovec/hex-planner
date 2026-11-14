import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../replay/cards/ids';
import { bench, NEAR, quote, secondary, TARGET, tactical } from '../kit';
import { id } from './ls';
import { turnProps } from '../../../../ui/testing/turnProps';
import { kernelViewOf } from '../../../../ui/testing/view';

uiBench();

const table = (gains: string[]) => {
  const take = tactical(TARGET, {
    moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
  }, gains.length > 0 ? { gains } : {});
  const pay = secondary(CARD.leadership, { boughtTokens: 1, tokens: { tactic: 1 }, payment: { planets: ['t1'], tradeGoods: 0 } });
  return { pay, take, ...bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[take], [pay]] }) };
};

// "This planet's resource value is increased by 1 and its influence value is increased by 2." LRR 35.2.
// Checks: in «Taken and discarded» of the landing that gains Target One the player takes Lazax Survivors.
// Why the check is redundant here: nothing is lifted; the choice must offer an exploration card drawn with a planet.
test('exploration:ls is taken in «Taken and discarded» of the entry that explores the planet', async () => {
  const lazax = table([]);
  quote(lazax.pack, id, 'its influence value is increased by 2');
  useGame.setState({ game: lazax.game });
  const onChange = vi.fn();
  render(<GainsBlock {...turnProps(kernelViewOf(lazax.game, lazax.pack), lazax.pack, lazax.take, onChange)} pack={lazax.pack}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Lazax Survivors');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Lazax Survivors' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

// Checks: with the card on Target One the token bought next round with Target One alone shows no shortfall.
// Why the check is redundant here: Target One is worth 3 influence with the card.
test('exploration:ls attached, the token bought with Target One shows no influence shortfall', () => {
  const lazax = table([id]);
  showWarnings(lazax, lazax.pay);
  expectNotShown('shortInfluence');
});

// Checks: without the card the same payment is shown short.
// Why the check is NOT redundant here: nothing raises Target One.
test('exploration:ls not explored, the token bought with Target One is shown short of influence', () => {
  const plain = table([]);
  showWarnings(plain, plain.pay);
  expectShownStanding('shortInfluence');
});
