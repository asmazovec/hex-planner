import { expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import { choose, play, showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, endOf, TARGET } from '../kit';
import { id } from './nekrohero';

uiBench();

const table = () => {
  const turn = componentAction(undefined as unknown as string);
  return { turn, ...bench({
    faction: 'nekro', expansions: ['pok'], units: { [TARGET]: { cruiser: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [turn],
    edit: pack => { pack.planets.t1 = { ...pack.planets.t1, tech: ['warfare'] }; },
  }) };
};

// "Choose a planet that has a technology specialty in a system that contains your units. ... gain 1 technology that
//  matches the specialty of that planet."
// Checks: after the planet is chosen the editor offers the technologies of its colour (here warfare: Plasma Scoring,
// not Hyper Metabolism), the one pressed is kept in the choices and is held after the action.
// Why: the technology is chosen in the component action's own block, not added by hand in «Took».
test('leader:nekrohero the technology of the planet\'s colour is chosen in the component action', async () => {
  const t = table();
  const live = showTurn(t, t.turn);
  await play('UNIT.DSGN.FLAYESH');
  expect(screen.queryByRole('group', { name: 'Technology' })).toBeNull();
  await choose('Target One', 'Planet');
  expect(screen.queryByRole('button', { name: 'Hyper Metabolism' })).toBeNull();
  await choose('Plasma Scoring', 'Technology');
  expect(live.entry().choices).toEqual({ planet: 't1', technology: 'technology:ps' });
  expect(endOf({ pack: t.pack, game: live.game() }).holdings.technologies).toContain('technology:ps');
}, 30000);
