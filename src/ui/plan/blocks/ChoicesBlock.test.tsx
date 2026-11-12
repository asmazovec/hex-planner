/**
 * The choices of a played component in the editors: the component action's own (`entry.choices`) and those of a
 * component named in «Used» (`entry.useChoices`). A throwaway `choose` stands in for a component's, and is taken away.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { bench, componentAction, NEAR, tactical, using } from '../../../domain/effects/components/kit';
import { effectOf } from '../../../domain/effects/registry';
import type { ChoiceSpec } from '../../../domain/effects/types';
import { choose, play, showTurn, showUses, uiBench, use } from '../../testing/effects';

uiBench();

const CARD = 'actionCard:bribery';
const RIVAL = { id: 'o1', faction: 'xxcha', vp: 0, seat: 2, color: 2 };
const SPECS: ChoiceSpec[] = [
  { key: 'planet', kind: 'planet', options: () => ['h1', 't1'] },
  { key: 'player', kind: 'player' },
  { key: 'count', kind: 'number', range: [0, 3], label: { ru: 'Сколько', en: 'How many' } },
  { key: 'unit', kind: 'unit', options: () => ['cruiser', 'destroyer'], when: chosen => chosen.planet === 't1' },
];
const asked = (pack: Parameters<typeof effectOf>[0]) => { effectOf(pack, CARD)!.choose = SPECS; };

const table = (entries = [componentAction(undefined as unknown as string)]) => {
  const t = bench({ faction: 'sol', start: { hand: [CARD] }, entries, game: { opponents: [RIVAL] } });
  asked(t.pack);
  return t;
};

describe('the choices of a component action', () => {
  test('the component asks, the buttons are its candidates, and every press is kept in the entry', async () => {
    const turn = componentAction(undefined as unknown as string);
    const live = showTurn(table([turn]), turn);
    await play('Bribery');
    expect(screen.getByRole('group', { name: 'Bribery' })).toBeTruthy();
    await choose('Home One');
    expect(live.entry().choices).toEqual({ planet: 'h1' });
    await choose(/Xxcha/, 'Player');
    expect(live.entry().choices).toEqual({ planet: 'h1', player: 'o1' });
  });

  test('pressing the chosen one takes it back, and a choice that stops being asked goes with its answer', async () => {
    const turn = componentAction(undefined as unknown as string);
    const live = showTurn(table([turn]), turn);
    await play('Bribery');
    expect(screen.queryByRole('group', { name: 'Unit' })).toBeNull();
    await choose('Target One');
    await choose('Cruiser');
    expect(live.entry().choices).toEqual({ planet: 't1', unit: 'cruiser' });
    await choose('Home One');
    expect(live.entry().choices).toEqual({ planet: 'h1' });
    await choose('Home One');
    expect(live.entry().choices).toBeUndefined();
  });

  test('a number is a stepper in the language of the effect\'s label; the entry keeps the value', async () => {
    const turn = componentAction(undefined as unknown as string);
    const live = showTurn(table([turn]), turn);
    await play('Bribery');
    const stepper = screen.getByRole('group', { name: 'How many' });
    await userEvent.click(within(stepper).getByRole('button', { name: 'Add one How many' }));
    expect(live.entry().choices).toEqual({ count: 1 });
  });
});

describe('the choices of a component used beside an action', () => {
  test('a card in «Used» asks under its own card; the answer is kept for it alone in `useChoices`', async () => {
    const move = using(tactical(NEAR, {}), CARD);
    const t = bench({ faction: 'sol', start: { hand: [CARD] }, entries: [move], game: { opponents: [RIVAL] } });
    asked(t.pack);
    const live = showUses(t, move);
    await choose('Target One');
    expect((live.entry() as { useChoices?: unknown }).useChoices).toEqual({ [CARD]: { planet: 't1' } });
    expect(live.entry().choices).toBeUndefined();
  });

  test('removing the card takes its choices with it', async () => {
    const empty = tactical(NEAR, {});
    const t = bench({ faction: 'sol', start: { hand: [CARD] }, entries: [empty], game: { opponents: [RIVAL] } });
    asked(t.pack);
    const live = showUses(t, empty);
    await use('Bribery');
    await choose('Home One');
    expect((live.entry() as { useChoices?: unknown }).useChoices).toEqual({ [CARD]: { planet: 'h1' } });
    await userEvent.click(screen.getByRole('button', { name: 'Remove Bribery' }));
    expect(live.entry().uses).toBeUndefined();
    expect((live.entry() as { useChoices?: unknown }).useChoices).toBeUndefined();
  });
});
