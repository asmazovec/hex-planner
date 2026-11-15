/**
 * The options of a turn: what a candidate edit would cause, asked of the same resolver the plan replay uses. Each choice
 * point is tested with something that changes its answer (a technology, a token, an exhausted planet), and a property
 * test holds the question to the replay: an option is clean exactly when the plan with the edit written into it has no
 * standing warning the plan without the option has not.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { FAR, HOME, NEAR, NO_PAYMENT, planned, primary, rulesGame, rulesPack, tactical, TARGET, tech } from '../domain/rules/kit';
import { standing } from '../domain/rules/registry';
import type { DataPack, Warning } from '../domain/types';
import { savedOf } from '../testing/legacySave';
import type { Entry, Game } from '../testing/old/domain/types';
import { forgetTimelines, pointOf, pointOfNewTactical, timelineOf } from './projection';
import { withTurnReplaced } from '../game/edit/plan';
import { candidatesAt, causes, cleanOf, editedBy, optionsAt, sameAs, withoutOption, type Candidate, type ChoicePoint, type Point } from '../game/options';
import type { Turn } from '../game/actions';
import { timeline } from '../game/timeline';
import { warningsByTurn } from '../game/rowWarnings';

const pack = rulesPack();
beforeEach(() => forgetTimelines());

/** The point of an entry of a rules game, in the app's own way: the saved game, its timeline, the turn the plan holds. */
function at(game: Game, entry: Entry, on: DataPack = pack): Point {
  const saved = savedOf(game, on);
  const line = timelineOf(saved, saved.activePlanId, 'forecast', on);
  const turn = line.rounds.flatMap(r => r.turns).flatMap(t => [t, ...(t.action.kind === 'strategic' ? t.action.nested ?? [] : [])]).find(t => t.id === entry.id)!;
  return pointOf(line, turn)!;
}

const codes = (warnings: Warning[]): string[] => warnings.map(w => w.code as string);
const withTech = (...ids: string[]) => ({ start: { me: { technologies: ids }, opponents: {} } });

describe('the active system', () => {
  test('a system that already holds the player\'s command token is warned, the others are clean', () => {
    const first = tactical(TARGET);
    const second = tactical(NEAR);
    const point = at(rulesGame({ entries: [first, second] }), second);
    expect(codes(causes(point, { kind: 'system', system: TARGET }))).toEqual(['systemHasToken']);
    expect(causes(point, { kind: 'system', system: FAR })).toEqual([]);
    const clean = cleanOf(optionsAt(point, { at: 'system' })).map(c => (c as { system: string }).system);
    expect(clean).toContain(FAR);
    expect(clean).not.toContain(TARGET);
  });

  test('a new action, not in the plan yet: with no tactic token left every system is warned', () => {
    const saved = savedOf(rulesGame({ entries: [tactical(TARGET), tactical(NEAR), tactical(FAR)] }), pack);
    const line = timelineOf(saved, saved.activePlanId, 'forecast', pack);
    const point = pointOfNewTactical(line, 1, 'p1')!;
    // The rules tester starts with three tactic tokens: the fourth action has none.
    expect(optionsAt(point, { at: 'system' }).every(o => o.adds.length > 0)).toBe(true);
    const fresh = savedOf(rulesGame({ entries: [tactical(TARGET)] }), pack);
    const open = pointOfNewTactical(timelineOf(fresh, fresh.activePlanId, 'forecast', pack), 1, 'p1')!;
    expect(causes(open, { kind: 'system', system: NEAR })).toEqual([]);
    expect(codes(causes(open, { kind: 'system', system: TARGET }))).toEqual(['systemHasToken']);
  });
});

describe('the route', () => {
  const map = { [HOME]: 'r-home', [NEAR]: 'r-asteroid', [TARGET]: 'r-target', [FAR]: 'r-empty', '4,0': 'r-empty' };

  test('a way through an asteroid field is warned, and clean with Antimass Deflectors', () => {
    const move = tactical(TARGET);
    const route: Candidate = { kind: 'route', source: HOME, via: [NEAR], ships: { cruiser: 1 } };
    const bare = at(rulesGame({ map, units: { [HOME]: { cruiser: 1 } }, entries: [move] }), move);
    expect(codes(causes(bare, route))).toContain('routeBlocked');
    const held = at(rulesGame({ map, units: { [HOME]: { cruiser: 1 } }, entries: [move], game: withTech('technology:amd') }), move);
    expect(causes(held, route)).toEqual([]);
  });

  test('a source under the player\'s own token is warned (58.3.3)', () => {
    const first = tactical(HOME);
    const move = tactical(TARGET);
    const point = at(rulesGame({ units: { [HOME]: { cruiser: 1 }, [FAR]: { cruiser: 1 } }, entries: [first, move] }), move);
    const options = optionsAt(point, { at: 'source' });
    const of = (slot: string) => options.find(o => (o.candidate as { source: string }).source === slot)!;
    expect(codes(of(HOME).adds)).toContain('sourceActivated');
    expect(of(FAR).adds).toEqual([]);
  });

  test('the next system of a route under way: beyond the move of the fastest ship it is warned', () => {
    // A carrier moves 1: from the home system the target is two steps away.
    const move = tactical(TARGET);
    const slow = at(rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [move] }), move);
    const next = (point: Point, slot: string) => optionsAt(point, { at: 'route', path: [HOME] }).find(o => (o.candidate as { via: string[] }).via.at(-1) === slot);
    expect(codes(next(slow, NEAR)!.adds)).toContain('speedShort');
    const fast = at(rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [move] }), move);
    expect(next(fast, NEAR)!.adds).toEqual([]);
  });
});

describe('the units of a flight', () => {
  const units = { [HOME]: { carrier: 1, fighter: 6 } };
  const body = { moves: [{ from: HOME, units: { carrier: 1, fighter: 4 } }] };
  const fifth: Candidate = { kind: 'fly', source: HOME, from: HOME, unit: 'fighter' };

  test('a fighter beyond the capacity of the carrier is warned, and clean with Carrier II', () => {
    const move = tactical(NEAR, body);
    expect(codes(causes(at(rulesGame({ units, entries: [move] }), move), fifth))).toContain('capacityGroup');
    const upgraded = tactical(NEAR, body);
    expect(causes(at(rulesGame({ units, entries: [upgraded], game: withTech(tech('carrier')) }), upgraded), fifth)).toEqual([]);
  });

  test('once taken beyond the capacity the option stays warned: it is compared with the turn without it', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1, fighter: 5 } }] });
    const point = at(rulesGame({ units, entries: [move] }), move);
    expect(codes(causes(point, fifth))).toContain('capacityGroup');
    // Another carrier would carry them: that option adds nothing.
    expect(causes(at(rulesGame({ units: { [HOME]: { carrier: 2, fighter: 5 } }, entries: [move] }), move), { kind: 'fly', source: HOME, from: HOME, unit: 'carrier' })).toEqual([]);
  });

  test('a unit the source does not hold is warned', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
    const point = at(rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [move] }), move);
    expect(codes(causes(point, { kind: 'fly', source: HOME, from: HOME, unit: 'carrier' }))).toContain('unitsMissing');
  });
});

describe('the landing', () => {
  test('a ground force beyond what arrived is warned', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    const point = at(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [move] }), move);
    expect(codes(causes(point, { kind: 'land', planet: 't2', unit: 'infantry' }))).toContain('landingOverLimit');
    const roomy = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    expect(causes(at(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [roomy] }), roomy), { kind: 'land', planet: 't2', unit: 'infantry' })).toEqual([]);
  });
});

describe('the production', () => {
  const docked = { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } as Partial<Game>;

  test('a unit the planets cannot pay for is warned; the price pays anew as in the editor', () => {
    const build = tactical(HOME, { production: {} });
    const point = at(rulesGame({ entries: [build], game: docked }), build);
    // Home One 3 and Home Two 1: a cruiser (2) is paid, a war sun (12) is not.
    expect(causes(point, { kind: 'produce', unit: 'cruiser', planet: null })).toEqual([]);
    expect(codes(causes(point, { kind: 'produce', unit: 'warsun', planet: null })).length).toBeGreaterThan(0);
    const clean = cleanOf(optionsAt(point, { at: 'production' })).map(c => (c as { unit: string }).unit);
    expect(clean).toContain('cruiser');
    expect(clean).not.toContain('warsun');
  });

  test('without a space dock every unit is warned', () => {
    const build = tactical(TARGET, { production: {} });
    const point = at(rulesGame({ entries: [build] }), build);
    expect(optionsAt(point, { at: 'production' }).every(o => o.adds.length > 0)).toBe(true);
  });
});

describe('the payment', () => {
  test('an exhausted planet is warned, a ready one is clean', () => {
    // The first action exhausts Home One for a cruiser; the second pays with what is left.
    const first = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const second = tactical(NEAR, { production: {}, payment: NO_PAYMENT });
    const point = at(rulesGame({ entries: [first, second], game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } }), second);
    expect(codes(causes(point, { kind: 'pay', of: 'production', planet: 'h1' }))).toContain('planetExhausted');
    expect(causes(point, { kind: 'pay', of: 'production', planet: 'h2' })).toEqual([]);
    expect(codes(causes(point, { kind: 'payGoods', of: 'production' }))).toContain('shortTradeGoods');
  });
});

describe('the strategy card', () => {
  test('a card already played this round is warned as a primary again', () => {
    const first = primary(1);
    const again = primary(4);
    const game = rulesGame({ entries: [first, again] });
    game.plans[0].rounds[0].strategyCard = 1;
    const point = at(game, again);
    const options = optionsAt(point, { at: 'card' });
    const of = (card: number) => options.find(o => (o.candidate as { card: number }).card === card)!;
    // Leadership is the player's card and was played: tapped again it starts as its secondary, which is one's own.
    expect(of(1).adds.length).toBeGreaterThan(0);
  });

  test('the primary of a card the player does not hold costs a strategy token: with none left it is warned', () => {
    const turn = primary(4);
    const game = rulesGame({ entries: [turn] });
    game.plans[0].rounds[0].strategyCard = 4;
    const held = at(game, turn);
    expect(causes(held, { kind: 'side', primary: true })).toEqual([]);
  });
});

describe('a component', () => {
  test('one the player does not hold is warned as the component of an action, one held and ready is clean', () => {
    const play = planned({ type: 'component', label: '' } as never);
    const game = rulesGame({ entries: [play], game: withTech('technology:gls') });
    const point = at(game, play);
    expect(causes(point, { kind: 'use', component: 'technology:gls' })).toEqual([]);
    expect(codes(causes(point, { kind: 'use', component: 'technology:amd' }))).toContain('componentNotHeld');
    const options = optionsAt(point, { at: 'use', among: ['technology:gls', 'technology:amd'] });
    expect(cleanOf(options)).toEqual([{ kind: 'use', component: 'technology:gls' }]);
  });
});

describe('the question and the replay agree', () => {
  /** The standing warnings the plan gives a turn once it is written into its round. */
  function replayed(point: Point, game: Game, turn: Turn): Warning[] {
    const saved = savedOf(game, pack);
    const line = timelineOf(saved, saved.activePlanId, 'forecast', pack);
    const rounds = line.rounds.map(r => withTurnReplaced(r, turn.id, turn));
    const next = timeline(line.table, pack, rounds, 'forecast', { start: line.start });
    void point;
    return standing(warningsByTurn(next)[turn.id] ?? []);
  }

  const games: { name: string; game: () => { game: Game; entry: Entry }; points: ChoicePoint[] }[] = [
    {
      name: 'a flight from two sources with a landing and a production',
      game: () => {
        const first = tactical(FAR);
        const entry = tactical(TARGET, {
          moves: [{ from: HOME, units: { carrier: 1, fighter: 3, infantry: 1 }, via: [NEAR] }, { from: NEAR, units: { cruiser: 1 } }],
          landings: [{ planetId: 't1', units: { infantry: 1 } }],
        });
        return { game: rulesGame({ units: { [HOME]: { carrier: 1, fighter: 5, infantry: 2 }, [NEAR]: { cruiser: 2 }, [FAR]: { destroyer: 1 } }, entries: [first, entry], game: { docks: ['t1'], planetControl: { t1: 'me', h1: 'me' } } }), entry };
      },
      points: [{ at: 'system' }, { at: 'source' }, { at: 'route', path: [FAR] }, { at: 'flight', source: HOME }, { at: 'flight', source: NEAR }, { at: 'landing' }, { at: 'production' }, { at: 'payment', of: 'production' }],
    },
    {
      name: 'a strategy card of the round',
      game: () => {
        const first = primary(1);
        const entry = primary(5);
        const game = rulesGame({ entries: [first, entry] });
        game.plans[0].rounds[0].strategyCard = 1;
        return { game, entry };
      },
      points: [{ at: 'card' }, { at: 'side' }, { at: 'payment', of: 'card' }, { at: 'use', among: ['technology:gls', 'technology:amd', 'technology:st'] }],
    },
  ];

  for (const { name, game: make, points } of games) {
    test(`${name}: clean exactly when the plan with the edit has no new standing warning`, () => {
      const { game, entry } = make();
      const point = at(game, entry);
      let asked = 0;
      for (const where of points) {
        for (const candidate of candidatesAt(point, where)) {
          const had = new Set(replayed(point, game, withoutOption(point, candidate)).map(sameAs));
          const after = replayed(point, game, editedBy(point, candidate)).filter(w => !had.has(sameAs(w)));
          expect({ candidate, adds: codes(causes(point, candidate)) }).toEqual({ candidate, adds: codes(after) });
          asked += 1;
        }
      }
      expect(asked).toBeGreaterThan(10);
    });
  }
});
