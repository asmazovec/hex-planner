import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { uiBench } from '../../../../ui/testing/effects';
import { bench, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './exp1';
import { turnProps } from '../../../../ui/testing/turnProps';
import { kernelViewOf } from '../../../../ui/testing/view';

uiBench();

// "If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, ready this planet." LRR 35.2: the explorer draws and resolves a card of the planet's deck.
// Checks: in В«Taken and discardedВ» of the landing that gains Target One the player takes Expedition.
// Why the check is redundant here: nothing is lifted; the choice must offer an exploration card drawn with a planet.
test('exploration:exp1 is taken in В«Taken and discardedВ» of the entry that explores the planet', async () => {
  const take = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, mech: 1 } }], landings: [{ planetId: 't1', units: { mech: 1 } }] });
  const explored = bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, mech: 1 } }, entries: [take] });
  quote(explored.pack, id, 'If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, ready this planet.');
  useGame.setState({ game: explored.game });
  const onChange = vi.fn();
  render(<GainsBlock {...turnProps(kernelViewOf(explored.game, explored.pack), explored.pack, take, onChange)} pack={explored.pack}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Expedition');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Expedition' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

test.todo('exploration:exp1 the choice of the infantry removed in the editor: pass 2 designs where the card\'s choices stand');
