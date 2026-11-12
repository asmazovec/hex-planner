import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { GainsBlock } from '../../../../ui/plan/blocks/GainsBlock';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { tech } from '../../../rules/kit';
import type { Entry } from '../../../types';
import { adjust, bench, componentAction, quote } from '../kit';
import { id } from './ed1';

uiBench();

const table = (entries: Entry[]) => bench({ faction: 'letnev', expansions: ['pok'], entries, game: { planetControl: { t1: 'me' } } });

// "Place this card faceup in your play area." LRR 35 note 2: Enigmatic Device is placed into play.
// Checks: in «Taken and discarded» the player takes the Enigmatic Device explored from a frontier token.
// Why the check is redundant here: nothing is lifted; the choice offers only what a player holds as a card today, and
// the device is held.
test('exploration:ed1 is taken in «Taken and discarded» of the entry that explores', async () => {
  const take = adjust({});
  const device = table([take]);
  quote(device.pack, id, 'Place this card faceup in your play area.');
  useGame.setState({ game: device.game });
  const onChange = vi.fn();
  render(<GainsBlock entry={take} pack={device.pack} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'Enigmatic Device');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Enigmatic Device' }));
  expect(onChange).toHaveBeenCalledWith({ gains: [id] });
});

// "ACTION: You may spend 6 resource and purge this card to research 1 technology."
// Checks: the action paid with four resources shows the resource shortfall.
// Why the check is NOT redundant here: the card names six.
test('exploration:ed1 played for four resources shows the resource shortfall', () => {
  const action = { ...componentAction(id, { choices: { technology: tech('cruiser') } } as Partial<Entry>), payment: { planets: ['h1', 'h2'], tradeGoods: 0 } } as Entry;
  showWarnings(table([{ ...adjust({}), gains: [id] }, action]), action);
  expectShownStanding('shortResources');
});

test.todo('exploration:ed1 the payment and the technology of its action in the editor of a component action: pass 2 designs them');
