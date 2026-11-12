import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { showWarnings, uiBench } from '../../../../ui/testing/effects';
import { MECATOL_PLANET } from '../../../mecatol';
import { bench, componentAction, quote } from '../kit';
import { id } from './lgf';

uiBench();

// "ACTION: If you control Mecatol Rex, exhaust this card to place 1 infantry from your reinforcements on Mecatol Rex."
// Checks: the ACTION entered with Mecatol Rex controlled shows no warning: the infantry comes from the reinforcements
// by the card's own text, and the card was ready.
// Why nothing stands: the card is held and ready, and its condition (Mecatol Rex controlled) holds.
test('technology:lgf its ACTION with Mecatol Rex controlled shows no warning', () => {
  const action = componentAction(id);
  const winnu = bench({ faction: 'winnu', start: { technologies: [id] }, entries: [action], game: { planetControl: { [MECATOL_PLANET]: 'me' } } });
  quote(winnu.pack, id, 'exhaust this card to place 1 infantry from your reinforcements on Mecatol Rex');
  showWarnings(winnu, action);
  expect(document.querySelectorAll('li[data-code]')).toHaveLength(0);
  expect(screen.queryByText(/Allowed by/)).toBeNull();
});

test.todo('technology:lgf the map highlights the Mecatol Rex system as reachable from a wormhole during the Winnu\'s flight: the bench renders no map');
