import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { uiBench } from '../../../../ui/testing/effects';
import { bench, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './lf1';
import { turnProps } from '../../../../ui/testing/turnProps';
import { kernelViewOf } from '../../../../ui/testing/view';
import { seedGame } from '../../../../testing/store';

uiBench();

// "You may gain 1 commodity, or you may spend 1 trade good or 1 commodity to place 1 mech from your reinforcements on
//  this planet." LRR 35.2.
// Checks: in «Taken and discarded» of the landing that gains Target One the player takes Local Fabricators.
// Why the check is redundant here: nothing is lifted; the choice must offer an exploration card drawn with a planet.
test('exploration:lf1 is taken in «Taken and discarded» of the entry that explores the planet', async () => {
  const take = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
  const explored = bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [take] });
  quote(explored.pack, id, 'to place 1 mech from your reinforcements on this planet');
  seedGame(explored.game);
  const onChange = vi.fn();
  render(<GainsBlock {...turnProps(kernelViewOf(explored.game, explored.pack), explored.pack, take, onChange)} pack={explored.pack}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Local Fabricators');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Local Fabricators' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

test.todo('exploration:lf1 the choice between a commodity and a mech, and what the mech costs, in the editor; the mech shown on the planet: pass 2 designs where the card\'s choices stand');
