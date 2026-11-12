import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { uiBench } from '../../../../ui/testing/effects';
import { bench, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './aw1';

uiBench();

// "You may gain 2 commodities, or you may convert up to 2 of your commodities to trade goods." LRR 35.2.
// Checks: in «Taken and discarded» of the landing that gains Target One the player takes Abandoned Warehouses.
// Why the check is redundant here: nothing is lifted; the choice must offer an exploration card drawn with a planet.
test.fails('exploration:aw1 is taken in «Taken and discarded» of the entry that explores the planet', async () => {
  const take = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
  const explored = bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [take] });
  quote(explored.pack, id, 'or you may convert up to 2 of your commodities to trade goods');
  useGame.setState({ game: explored.game });
  const onChange = vi.fn();
  render(<GainsBlock entry={take} pack={explored.pack} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Abandoned Warehouses');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Abandoned Warehouses' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

test.todo('exploration:aw1 the choice between gaining and converting in the editor: pass 2 designs where the card\'s choices stand');
