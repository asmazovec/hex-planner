import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './custodiavigilia';

uiBench();

const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: '18', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
/** A tactical action in the Mecatol Rex system producing 3 infantry, with no space dock anywhere. */
const show = (control: Record<string, 'me' | 'enemy'>) => {
  const move = tactical(TARGET, { production: { infantry: 3 } });
  const table = bench({ faction: 'keleresm', expansions: ['pok'], entries: [move], game: { map: MAP, planetControl: control } });
  return { table, live: showTactical(table, move) };
};

// "While you control Mecatol Rex, it gains SPACE CANNON 5 and PRODUCTION 3."
// Checks: the tactical editor of an action in the Mecatol Rex system, with 3 infantry produced and no space dock,
// shows no warning that the system has no unit with Production, while I control Custodia Vigilia and Mecatol Rex.
// Why the check is redundant here: Mecatol Rex has PRODUCTION 3 by the card.
test.fails('legendary:custodiavigilia production on Mecatol Rex with no space dock shows no missing Production', () => {
  const { table, live } = show({ mr: 'me', custodiavigilia: 'me' });
  quote(table.pack, id, 'it gains SPACE CANNON 5 and PRODUCTION 3');
  expect(live.entry().production).toEqual({ infantry: 3 });
  expectNotShown('noProduction');
  expectNotShown('productionOver');
});

// LRR 67.1: production needs a unit with Production in the system.
// Checks: holding Mecatol Rex without Custodia Vigilia, the same production shows the warning, standing.
// Why the check is NOT redundant here: the card is in force for the player who controls Custodia Vigilia only.
test('legendary:custodiavigilia without Custodia Vigilia the missing Production stands', () => {
  show({ mr: 'me' });
  expectShownStanding('noProduction');
});
