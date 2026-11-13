import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { emptyHoldings, holdingsOf } from '../holdings';
import { forecast, rulesGame, rulesPack, tech } from '../rules/kit';
import type { Entry, Opponent } from '../types';
import { applied, stacked } from './apply';
import { effectOf, hintsAt, stepsOfWindow } from './registry';
import type { ComponentEffect } from './types';

const pack = rulesPack();
const pok = loadPack(['pok']);
const carrier = { faction: 'rules-tester', unit: 'carrier' as const };

describe('applied: a point of the count asks the ready components of the player', () => {
  test('a held unit upgrade changes the value, and `by` names it', () => {
    expect(applied(pack, holdingsOf({ technologies: [tech('carrier')] }), 'speed', 1, carrier)).toEqual({ value: 2, by: [tech('carrier')] });
    expect(applied(pack, holdingsOf({ technologies: [tech('carrier')] }), 'capacity', 4, carrier)).toEqual({ value: 6, by: [tech('carrier')] });
  });

  test('with nothing held the base comes back, changed by no one', () => {
    expect(applied(pack, emptyHoldings(), 'speed', 1, carrier)).toEqual({ value: 1, by: [] });
  });

  test('a component that leaves the value as it was is not named: Carrier II does not speak of a cruiser, nor of its cost', () => {
    const held = holdingsOf({ technologies: [tech('carrier')] });
    expect(applied(pack, held, 'speed', 2, { faction: 'rules-tester', unit: 'cruiser' })).toEqual({ value: 2, by: [] });
    expect(applied(pack, held, 'unitCost', 3, carrier)).toEqual({ value: 3, by: [] });
    expect(applied(pack, held, 'fleetLimit', 3, { faction: 'rules-tester' })).toEqual({ value: 3, by: [] });
  });

  test('34.4.1 a passive ability on an exhausted card is still in effect', () => {
    const held = { ...holdingsOf({ technologies: [tech('carrier')] }), exhausted: [tech('carrier')] };
    expect(applied(pack, held, 'speed', 1, carrier)).toEqual({ value: 2, by: [tech('carrier')] });
  });

  test('a component id the pack does not know is passed over', () => {
    expect(applied(pack, holdingsOf({ technologies: ['technology:gone', tech('carrier')], relics: ['relic:gone'] }), 'speed', 1, carrier)).toEqual({ value: 2, by: [tech('carrier')] });
  });

  test('a hint changes nothing: a held technology that is no unit upgrade leaves every point alone', () => {
    expect(effectOf(pack, 'technology:asc')).toMatchObject({ tier: 'hint', rule: 'technology:asc' });
    expect(applied(pack, holdingsOf({ technologies: ['technology:asc'] }), 'speed', 1, carrier)).toEqual({ value: 1, by: [] });
  });

  test('two modifiers stack in registry order, and `by` lists both', () => {
    const plus: ComponentEffect = { tier: 'passive', rule: 'test', modify: { speed: value => value + 1 } };
    const double: ComponentEffect = { tier: 'passive', rule: 'test', modify: { speed: value => value * 2 } };
    expect(stacked([['a', plus], ['b', double]], 'speed', 1, carrier)).toEqual({ value: 4, by: ['a', 'b'] });
    expect(stacked([['b', double], ['a', plus]], 'speed', 1, carrier)).toEqual({ value: 3, by: ['b', 'a'] });
  });

  test('held components are asked in the order of the registry, whatever the order they were gained in', () => {
    // Sol holding both the common Carrier II and their own Advanced Carrier II: each sets level II of Sol's carrier, so only the first asked changes it.
    const sol = loadPack([]);
    const ctx = { faction: 'sol', unit: 'carrier' as const };
    const asked = applied(sol, holdingsOf({ technologies: ['technology:cv2', 'technology:ac2'] }), 'capacity', 6, ctx);
    expect(asked).toEqual({ value: 8, by: ['technology:ac2'] });
    expect(applied(sol, holdingsOf({ technologies: ['technology:ac2', 'technology:cv2'] }), 'capacity', 6, ctx)).toEqual(asked);
  });
});

describe('hints: where a component the app does not count is shown', () => {
  test('the window of an action card gives the step of its hint', () => {
    expect(stepsOfWindow('action', 'At the start of an invasion')).toEqual(['invasion']);
    expect(stepsOfWindow('action', 'After you activate a system')).toEqual(['activation']);
    expect(stepsOfWindow('action', 'After you activate an anomaly')).toEqual(['activation']);
    expect(stepsOfWindow('action', 'After the active player moves ships into the active system during a tactical action')).toEqual(['movement']);
    expect(stepsOfWindow('action', 'At the start of a combat round')).toEqual(['combat']);
    expect(stepsOfWindow('action', 'After 1 of your ships is destroyed during a space combat')).toEqual(['combat']);
    expect(stepsOfWindow('action', 'When your last ship in the active system is destroyed')).toEqual(['combat']);
    expect(stepsOfWindow('action', 'After your ground forces make combat rolls during a round of ground combat')).toEqual(['invasion']);
    expect(stepsOfWindow('action', 'After another player commits units to land on a planet you control')).toEqual(['invasion']);
    expect(stepsOfWindow('action', 'When you gain control of a planet')).toEqual(['invasion']);
    expect(stepsOfWindow('action', 'After another player makes a BOMBARDMENT, SPACE CANNON, or ANTI-FIGHTER BARRAGE roll')).toEqual(['combat', 'invasion']);
    expect(stepsOfWindow('action', 'When 1 or more of your units use PRODUCTION')).toEqual(['production']);
    expect(stepsOfWindow('status', 'When you would return your strategy card(s) during the status phase')).toEqual(['status']);
    expect(stepsOfWindow('any', 'When you are negotiating a transaction')).toEqual(['transaction']);
    expect(stepsOfWindow('action', 'Action')).toEqual(['component']);
  });

  test('the agenda and strategy phases have no step, nor has a window about turns or other cards', () => {
    expect(stepsOfWindow('agenda', 'After an agenda is revealed')).toEqual([]);
    expect(stepsOfWindow('agenda', 'During the agenda phase when an outcome would be resolved')).toEqual([]);
    expect(stepsOfWindow('strategy', 'At the start of the strategy phase')).toEqual([]);
    expect(stepsOfWindow('action', 'After you perform an action')).toEqual([]);
    expect(stepsOfWindow('any', 'When another player plays an action card other than \'Sabotage\'')).toEqual([]);
  });

  test('every action card is a hint or a play, and a hint has its step where its window names one; other kinds have no step yet', () => {
    const cards = pok.components.filter(component => component.kind === 'actionCard');
    expect(cards.length).toBeGreaterThan(80);
    for (const card of cards) {
      const effect = effectOf(pok, card.id);
      expect(['hint', 'play'], card.id).toContain(effect?.tier);
      if (effect?.tier !== 'hint') continue;
      const steps = stepsOfWindow(String(card.detail?.phase), String(card.detail?.window));
      expect(effect?.hintAt, card.id).toEqual(steps.length > 0 ? steps : undefined);
    }
    expect(effectOf(pok, 'actionCard:veto')).toMatchObject({ tier: 'hint', rule: 'actionCard:veto' });
    expect(effectOf(pok, 'relic:codex')).toMatchObject({ tier: 'hint', rule: 'relic:codex' });
  });

  describe('hintsAt', () => {
    const RIVAL: Opponent = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };
    const combatCard = pok.components.find(c => c.kind === 'actionCard' && effectOf(pok, c.id)?.hintAt?.includes('combat'))!.id;
    const invasionCard = pok.components.find(c => c.kind === 'actionCard' && effectOf(pok, c.id)?.hintAt?.join() === 'invasion')!.id;
    const draw = (ids: string[], owner?: string): Entry =>
      ({ id: `draw-${owner ?? 'me'}`, phase: 'action', status: 'planned', type: 'adjustment', label: '', delta: {}, gains: ids, ...(owner ? { owner } : {}) });
    const board = forecast(rulesGame({
      entries: [draw([combatCard, combatCard, invasionCard, 'actionCard:bribery']), draw([invasionCard], RIVAL.id)],
      game: { opponents: [RIVAL], playerCount: 3 },
    }), pok).state;

    test('gives the hint components of a step that the named players hold, each once', () => {
      expect(hintsAt(pok, board, 'combat', ['me']).map(c => c.id)).toEqual([combatCard]);
      expect(hintsAt(pok, board, 'invasion', ['me']).map(c => c.id)).toEqual([invasionCard]);
      expect(hintsAt(pok, board, 'production', ['me'])).toEqual([]);
    });

    test('an opponent is asked by id, and only the named players count', () => {
      expect(hintsAt(pok, board, 'invasion', [RIVAL.id]).map(c => c.id)).toEqual([invasionCard]);
      expect(hintsAt(pok, board, 'combat', [RIVAL.id])).toEqual([]);
      expect(hintsAt(pok, board, 'combat', ['me', RIVAL.id]).map(c => c.id)).toEqual([combatCard]);
      expect(hintsAt(pok, board, 'combat', ['nobody'])).toEqual([]);
      expect(hintsAt(pok, board, 'combat', [])).toEqual([]);
    });

    test('an exhausted component is no hint, nor is one the pack does not know', () => {
      const tired = { ...board, holdings: { ...board.holdings, exhausted: [combatCard], hand: [...board.holdings.hand, 'actionCard:gone'] } };
      expect(hintsAt(pok, tired, 'combat', ['me'])).toEqual([]);
      expect(hintsAt(pok, tired, 'invasion', ['me']).map(c => c.id)).toEqual([invasionCard]);
    });
  });
});
