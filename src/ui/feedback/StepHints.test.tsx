import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../data/loadPack';
import { componentById, componentsOf } from '../../domain/components';
import { effectOf } from '../../domain/effects/registry';
import { emptyHoldings } from '../../domain/holdings';
import type { GameState, RuleStep } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { PlanScreen } from '../screens/PlanScreen';
import { StepHints } from './StepHints';

const pack = loadPack(['pok']);
/** An action card whose printed window belongs to this step and to no other. */
const cardOf = (step: RuleStep, kind = 'actionCard') => componentsOf(pack).find(c => c.kind === kind && effectOf(pack, c.id)?.hintAt?.join() === step)!;
const combat = cardOf('combat');
// No action card is a reminder for the production step now: Chaos Mapping is.
const production = cardOf('production', 'technology');
const played = cardOf('component');

const board = (hand: string[], rivalHand: string[] = []): GameState => {
  const state = (cards: string[]): GameState => ({
    systems: {}, ground: {}, exhausted: [], control: {}, tokensOnMap: [], tradeGoods: 0, commodities: 0, tactic: 0, fleet: 0, strategy: 0,
    vp: 0, opponentVp: {}, holdings: { ...emptyHoldings(), hand: cards }, docks: [], pds: {},
  });
  return { ...state(hand), rivals: { rival: state(rivalHand) } };
};

afterEach(cleanup);
beforeEach(() => setLanguage('en'));

describe('StepHints', () => {
  test('names the components the players hold for the step, and a press opens the printed text', async () => {
    render(<StepHints pack={pack} board={board([combat.id, production.id])} step="combat" players={['me']} />);
    const hints = screen.getByRole('group', { name: 'Reminders for this step' });
    expect(within(hints).getAllByTestId(/^component-/)).toHaveLength(1);
    expect(hints).not.toHaveTextContent(combat.text.slice(0, 24));
    await userEvent.click(within(hints).getByRole('button', { name: new RegExp(`^${combat.name}`) }));
    expect(hints).toHaveTextContent(combat.text.slice(0, 24));
    // A reminder only reminds: nothing on it changes what is held.
    expect(within(hints).getAllByRole('button')).toHaveLength(1);
  });

  test('asks only the players named', () => {
    const { rerender } = render(<StepHints pack={pack} board={board([], [combat.id])} step="combat" players={['me']} />);
    expect(screen.queryByRole('group', { name: 'Reminders for this step' })).toBeNull();
    rerender(<StepHints pack={pack} board={board([], [combat.id])} step="combat" players={['me', 'rival']} />);
    expect(screen.getByRole('group', { name: 'Reminders for this step' })).toHaveTextContent(combat.name);
  });

  test('draws nothing when nothing is held for the step, or without a board', () => {
    const { container, rerender } = render(<StepHints pack={pack} board={board([production.id])} step="combat" players={['me']} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StepHints pack={pack} board={undefined} step="production" players={['me']} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the reminders in the editors', () => {
  const TARGET = '0,1';
  beforeEach(() => {
    document.elementFromPoint = () => null;
    useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
    useGame.getState().setTile('0,-3', null);
    useGame.getState().setTile('1,0', '5');
    useGame.getState().setTile(TARGET, '25');
    for (const id of [combat.id, production.id, played.id]) useGame.getState().setStartHolding('me', id, true);
  });
  const hintsAfter = (text: RegExp) => {
    const row = screen.getByRole('button', { name: text }).closest('.source-row')!;
    let next = row.nextElementSibling;
    while (next && !next.matches('.step-hints, .source-row, .editor-section')) next = next.nextElementSibling;
    return next;
  };

  test('a tactical action shows each under the block of its step: the battle, the production', async () => {
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
    await userEvent.click(document.querySelector(`[data-slot="${TARGET}"]`)!);
    const underBattle = hintsAfter(/^Battle/);
    expect(underBattle).toHaveClass('step-hints');
    expect(underBattle).toHaveTextContent(combat.name);
    expect(underBattle).not.toHaveTextContent(production.name);
    const underProduction = hintsAfter(/^Production/);
    expect(underProduction).toHaveClass('step-hints');
    expect(underProduction).toHaveTextContent(production.name);
  });

  test('a component action lists what can be played as one', async () => {
    useGame.getState().addEntry(1, { type: 'component', note: '' }, 'action');
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Edit/ }));
    const hints = screen.getByRole('group', { name: 'Reminders for this step' });
    expect(hints).toHaveTextContent(played.name);
    expect(hints).not.toHaveTextContent(combat.name);
    expect(componentById(pack, played.id)?.detail?.window).toBe('Action');
  });
});
