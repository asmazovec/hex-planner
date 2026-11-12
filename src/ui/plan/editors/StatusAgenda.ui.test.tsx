/**
 * The interface of the status infrastructure over the real replay: the objectives a status entry scores and the outcome
 * an agenda was resolved with, each press going through the replay and the warnings it makes shown under them.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { adjust, bench, statusTokens } from '../../../domain/effects/components/kit';
import { project } from '../../../domain/project';
import scoreWithoutHome from '../../../domain/rules/codes/scoreWithoutHome';
import type { Entry } from '../../../domain/types';
import { expectNotShown, expectShownStanding, showAgenda, showScored, uiBench } from '../../testing/effects';

uiBench();

const score = async (query: string, name: string) => {
  await userEvent.click(screen.getByRole('button', { name: 'Score an objective' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), query);
  await userEvent.click(await screen.findByRole('button', { name: `Choose ${name}` }));
};

test('a public objective scored without the home system shows the warning of the status phase, standing', async () => {
  const status = statusTokens(2, 0, 0);
  const table = bench({ faction: 'sol', entries: [status], game: { planetControl: { h1: 'enemy' } } });
  const live = showScored(table, status);
  await score('Develop Weaponry', 'Develop Weaponry');
  expect(live.entry().scored).toEqual(['publicObjective:develop']);
  expectShownStanding(scoreWithoutHome.code);
});

test('a secret objective scored without the home system shows no such warning', async () => {
  const status = statusTokens(2, 0, 0);
  const table = bench({ faction: 'sol', entries: [status], start: { secrets: ['secretObjective:dtgs'] }, game: { planetControl: { h1: 'enemy' } } });
  const live = showScored(table, status);
  await score('Destroy Their Greatest Ship', 'Destroy Their Greatest Ship');
  expect(live.entry().scored).toEqual(['secretObjective:dtgs']);
  expectNotShown(scoreWithoutHome.code);
});

test('the outcome of an agenda is pressed in the entry, and a law resolved against does not stay in play', async () => {
  const agenda = { ...adjust({}, 'agenda'), gains: ['agenda:sanctions'] } as Entry;
  const table = bench({ faction: 'sol', rounds: [[agenda]] });
  const live = showAgenda(table, agenda);
  await userEvent.click(screen.getByRole('button', { name: 'For' }));
  expect(live.entry().choices).toEqual({ outcome: 'for' });
  expect(project(live.game(), live.game().plans[0], 'forecast', table.pack).state.laws).toEqual(['agenda:sanctions']);
  await userEvent.click(screen.getByRole('button', { name: 'Against' }));
  expect(live.entry().choices).toEqual({ outcome: 'against' });
  expect(project(live.game(), live.game().plans[0], 'forecast', table.pack).state.laws ?? []).toEqual([]);
});

test('an elected player is chosen in the agenda entry, and the law binds them alone', async () => {
  const agenda = { ...adjust({}, 'agenda'), gains: ['agenda:minister_exploration'] } as Entry;
  const table = bench({ faction: 'sol', expansions: ['pok'], rounds: [[agenda]], game: { opponents: [{ id: 'r1', faction: 'hacan', vp: 0, seat: 2, color: 2 }] } });
  const live = showAgenda(table, agenda);
  await userEvent.click(screen.getByRole('button', { name: `Elect ${table.pack.factions.hacan.name}` }));
  expect(live.entry().choices).toEqual({ elect: 'r1' });
  expect(project(live.game(), live.game().plans[0], 'forecast', table.pack).state.lawOwners).toEqual({ 'agenda:minister_exploration': 'hacan' });
});
