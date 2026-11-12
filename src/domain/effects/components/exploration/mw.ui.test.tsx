import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './mw';

uiBench();

const table = (gains: string[]) => {
  const take = tactical(TARGET, {
    moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
  }, gains.length > 0 ? { gains } : {});
  const build = tactical(TARGET, { production: { fighter: 5 }, payment: { planets: ['h1'], tradeGoods: 0 } });
  return { build, take, ...bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[take], [build]], game: { docks: ['t1'] } }) };
};

// "This planet's resource value is increased by 2." LRR 35.2: the explorer draws and resolves a card of the planet's deck.
// Checks: in «Taken and discarded» of the landing that gains Target One the player takes Mining World.
// Why the check is redundant here: nothing is lifted; the choice must offer an exploration card drawn with a planet.
test.fails('exploration:mw is taken in «Taken and discarded» of the entry that explores the planet', async () => {
  const mining = table([]);
  quote(mining.pack, id, "This planet's resource value is increased by 2.");
  useGame.setState({ game: mining.game });
  const onChange = vi.fn();
  render(<GainsBlock entry={mining.take} pack={mining.pack} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Mining World');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Mining World' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

// LRR 67.2: a space dock's PRODUCTION value is 2 more than the resource value of its planet.
// Checks: the tactical editor of the next round builds five fighters at the dock on Target One with no overrun shown.
// Why the check is redundant here: with the card the dock produces six.
test.fails('exploration:mw attached, the production of the dock on its planet shows no overrun for five units', () => {
  const mining = table([id]);
  showTactical(mining, mining.build);
  expectNotShown('productionOver');
});

// Checks: without the card the same production is shown over by one.
// Why the check is NOT redundant here: the dock produces four.
test('exploration:mw not explored, five units at the dock on Target One are shown over its production', () => {
  const plain = table([]);
  showTactical(plain, plain.build);
  expectShownStanding('productionOver');
});
