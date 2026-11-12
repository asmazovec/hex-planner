import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, showWarnings, uiBench, use } from '../../../../ui/testing/effects';
import { componentById } from '../../../components';
import { bench, FAR, NEAR, quote, TARGET, tactical, using } from '../kit';
import { id } from './emelpar';

uiBench();

const AGENT = 'leader:letnevagent';
const table = (second = tactical(TARGET), third = using(tactical(FAR), AGENT)) => ({
  second, third,
  table: bench({
    faction: 'letnev', expansions: ['pok', 'te'], start: { leaders: { [AGENT]: 'unlocked' } },
    entries: [using(tactical(NEAR), AGENT), second, third], game: { planetControl: { emelpar: 'me' } },
  }),
});

// "You may exhaust this card at the end of your turn to ready another component that isn't a strategy card."
// Checks: in «Used» of the second turn I take The Acropolis; it then asks which component to ready (a group named
// «Ready with The Acropolis» offering the exhausted components), I press the agent, and the choice is written into
// the entry.
// Why the check is redundant here: the agent exhausted in the first turn is ready again, so its use later in the
// round breaks no rule (LRR 34.4 / 51.4).
test.fails('legendary:emelpar after taking The Acropolis in «Used» the agent to ready is chosen and written', async () => {
  const { second, table: game } = table();
  quote(game.pack, id, 'ready another component');
  const live = showUses(game, second);
  await use('The Acropolis');
  const agent = componentById(game.pack, AGENT)!.name;
  await userEvent.click(within(screen.getByRole('group', { name: 'Ready with The Acropolis' })).getByRole('button', { name: agent }));
  expect(live.entry()).toMatchObject({ uses: [id], choices: { ready: AGENT } });
});

// LRR 34.4: an exhausted card cannot be exhausted again until readied.
// Checks: without The Acropolis the third turn's use of the agent shows the warning that it is exhausted.
// Why the check is NOT redundant here: nothing readied the agent.
test('legendary:emelpar not used: the agent used again shows the exhausted warning', () => {
  const { third, table: game } = table();
  showWarnings(game, third);
  expectShownStanding('componentExhausted');
});

// Checks: with the agent readied by The Acropolis, the third turn shows no such warning.
test.fails('legendary:emelpar with the agent readied, its later use shows no exhausted warning', () => {
  const second = { ...using(tactical(TARGET), id), choices: { ready: AGENT } } as ReturnType<typeof tactical>;
  const { third, table: game } = table(second);
  showWarnings(game, third);
  expectNotShown('componentExhausted');
});
