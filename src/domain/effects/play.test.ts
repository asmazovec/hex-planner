/**
 * The infrastructure of playing a component, apart from any component: where choices live, what `play` is given, the
 * `gained` hook, the hand limit, hints of the faction sheet and of secrets, another player's commander lent by an
 * Alliance note, and the codes made by the play of a component. The components themselves have their own tests under
 * `components/`; a throwaway effect stands in for them here and is taken away after each test.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { EXTENSION_CODES } from '../rules/codes';
import { forecast } from '../rules/kit';
import componentUnresolved from '../rules/codes/componentUnresolved';
import { violation } from '../rules/registry';
import type { Entry, ExtensionCode } from '../types';
import { bench, componentAction, endOf, HOME, NEAR, tactical, using, warningsOf } from './components/kit';
import { choicesFor, optionsOf, shownChoices, withChoices } from './choices';
import { effectOf, hintsAt, inForce } from './registry';
import type { ComponentEffect } from './types';

const CARD = 'actionCard:bribery';
const SEVEN = ['actionCard:abs', 'actionCard:assassin', 'actionCard:bribery', 'actionCard:bunker', 'actionCard:confusing', 'actionCard:courageous', 'actionCard:cripple'];

/** Puts fields on the real effect of a component for one test; `restore` takes them away. */
const lent: [ComponentEffect, string][] = [];
function lend(effect: ComponentEffect, fields: Partial<ComponentEffect>): void {
  for (const key of Object.keys(fields)) lent.push([effect, key]);
  Object.assign(effect, fields);
}
afterEach(() => {
  for (const [effect, key] of lent.splice(0)) delete (effect as unknown as Record<string, unknown>)[key];
});

describe('choices of an entry', () => {
  const action = (extra: Partial<Entry> = {}) => componentAction(CARD, extra);

  test('the component action takes the entry\'s choices, `useChoices` of its own id wins over them', () => {
    expect(choicesFor(action({ choices: { planet: 'h1' } }), CARD)).toEqual({ planet: 'h1' });
    expect(choicesFor(action({ choices: { planet: 'h1' }, useChoices: { [CARD]: { planet: 'h2' } } }), CARD)).toEqual({ planet: 'h2' });
  });

  test('a component used beside the action takes the flat choices only on an entry with no component action of its own', () => {
    const move = tactical(NEAR, {}, { choices: { unit: 'cruiser' } });
    expect(choicesFor(move, 'technology:x')).toEqual({ unit: 'cruiser' });
    expect(choicesFor(action({ choices: { planet: 'h1' }, uses: ['technology:x'] }), 'technology:x')).toEqual({});
    expect(choicesFor({ ...move, useChoices: { 'technology:x': { unit: 'fighter' } } } as Entry, 'technology:x')).toEqual({ unit: 'fighter' });
  });

  test('`withChoices` keeps the choices of the component action in `choices` and of any other in `useChoices`, and drops what is empty', () => {
    const own = action({ uses: ['technology:x'] });
    expect(withChoices(own, CARD, { planet: 'h1' })).toEqual({ choices: { planet: 'h1' }, useChoices: undefined });
    expect(withChoices(own, 'technology:x', { planet: 'h1' })).toEqual({ choices: undefined, useChoices: { 'technology:x': { planet: 'h1' } } });
    expect(withChoices({ ...own, useChoices: { 'technology:x': { planet: 'h1' } } } as Entry, 'technology:x', {})).toEqual({ choices: undefined, useChoices: undefined });
  });

  test('the candidates of a choice are its own `options`, or the default of its kind; a dependent choice shows only while its `when` holds', () => {
    const table = bench({ faction: 'sol', game: { opponents: [{ id: 'o1', faction: 'xxcha', vp: 0, seat: 2, color: 2 }] } });
    const ctx = { game: table.game, pack: table.pack, state: endOf(table), shared: endOf(table), player: 'me', entry: action(), chosen: {} };
    expect(optionsOf({ key: 'p', kind: 'player' }, ctx)).toEqual(['o1']);
    expect(optionsOf({ key: 'p', kind: 'player' }, { ...ctx, player: 'o1' })).toEqual(['me']);
    expect(optionsOf({ key: 'p', kind: 'planet' }, ctx)).toEqual(expect.arrayContaining(['h1', 't1']));
    expect(optionsOf({ key: 'p', kind: 'system' }, ctx)).toContain(HOME);
    expect(optionsOf({ key: 'n', kind: 'number', range: [1, 3] }, ctx)).toEqual(['1', '2', '3']);
    expect(optionsOf({ key: 'o', kind: 'option', options: () => ['a', 'b'] }, ctx)).toEqual(['a', 'b']);
    const specs = [{ key: 'a', kind: 'planet' as const }, { key: 'b', kind: 'unit' as const, when: (c: Record<string, string | number>) => c.a === 'h1' }];
    expect(shownChoices(specs, {}).map(s => s.key)).toEqual(['a']);
    expect(shownChoices(specs, { a: 'h1' }).map(s => s.key)).toEqual(['a', 'b']);
  });
});

describe('what `play` is given', () => {
  test('the id, the owner, every player\'s state, the choices of that component and whether it is held', () => {
    const entry = componentAction(CARD, { choices: { planet: 'h1' } } as Partial<Entry>);
    const table = bench({
      faction: 'sol', start: { hand: [CARD] }, entries: [entry],
      game: { opponents: [{ id: 'o1', faction: 'xxcha', vp: 0, seat: 2, color: 2 }] },
    });
    const play = vi.fn();
    lend(effectOf(table.pack, CARD)!, { play });
    forecast(table.game, table.pack);
    const turn = play.mock.calls[0][0];
    expect(turn).toMatchObject({ id: CARD, player: 'me', choices: { planet: 'h1' }, held: true });
    expect(Object.keys(turn.states).sort()).toEqual(['me', 'o1']);
    expect(turn.states.me).toBe(turn.state);
  });

  test('a rival\'s entry is played for the rival, and a component not held says so', () => {
    const entry = componentAction(CARD, { owner: 'o1' });
    const table = bench({ faction: 'sol', entries: [entry], game: { opponents: [{ id: 'o1', faction: 'xxcha', vp: 0, seat: 2, color: 2 }] } });
    const play = vi.fn();
    lend(effectOf(table.pack, CARD)!, { play });
    forecast(table.game, table.pack);
    expect(play.mock.calls[0][0]).toMatchObject({ player: 'o1', held: false });
  });

  test('a component used on a tactical action is played with its `useChoices`, apart from the others used with it', () => {
    const other = 'actionCard:abs';
    const move = using(tactical(NEAR, {}, { useChoices: { [CARD]: { planet: 't1' }, [other]: { planet: 't2' } } }), CARD, other);
    const table = bench({ faction: 'sol', start: { hand: [CARD, other] }, entries: [move] });
    const play = vi.fn();
    lend(effectOf(table.pack, CARD)!, { play });
    forecast(table.game, table.pack);
    expect(play.mock.calls[0][0].choices).toEqual({ planet: 't1' });
  });

  test('a play may make a warning of its own, which the entry then lists', () => {
    const entry = componentAction(CARD);
    const table = bench({ faction: 'sol', start: { hand: [CARD] }, entries: [entry] });
    lend(effectOf(table.pack, CARD)!, { play: turn => turn.warnings.push(violation(componentUnresolved.code, { id: CARD, name: 'Bribery', reason: 'nothing to take' })) });
    expect(warningsOf(table, entry).map(w => w.code)).toEqual(['componentUnresolved']);
    expect(warningsOf(table, entry)[0]).toMatchObject({ step: 'component', rule: '2.6.1' });
  });
});

describe('`gained` hook', () => {
  test('runs for each component an entry\'s gains hands the player, with the owner\'s state', () => {
    const relic = 'relic:quantumcore';
    const entry = tactical(NEAR, {}, { gains: [relic] });
    const table = bench({ faction: 'sol', expansions: ['pok', 'te'], entries: [entry] });
    lend(effectOf(table.pack, relic)!, { gained: turn => { turn.state.tradeGoods += 5; } });
    expect(endOf(table).tradeGoods).toBe(5);
    expect(endOf(table).holdings.relics).toContain(relic);
  });
});

describe('the hand limit (2.4, 2.4.1)', () => {
  const draw = (): Entry => tactical(NEAR, {}, { gains: ['actionCard:disable'] });
  const hand = (cards: string[], extra: Parameters<typeof bench>[0]['start'] = {}) => {
    const entry = draw();
    return { entry, ...bench({ faction: 'sol', start: { hand: cards, ...extra }, entries: [entry] }) };
  };

  test('an eighth action card is warned of, with the cards and the limit', () => {
    const table = hand(SEVEN);
    expect(warningsOf(table, table.entry).filter(w => w.code === ('handOverLimit' as ExtensionCode))).toEqual([expect.objectContaining({ params: { cards: 8, limit: 7 } })]);
  });

  test('seven cards are within the limit', () => {
    const table = hand(SEVEN.slice(1));
    expect(warningsOf(table, table.entry).map(w => w.code)).not.toContain('handOverLimit');
  });

  test('an entry that adds nothing to a hand already over the limit says nothing more', () => {
    const idle = tactical(NEAR, {});
    const table = bench({ faction: 'sol', start: { hand: [...SEVEN, 'actionCard:disable'] }, entries: [idle] });
    expect(warningsOf(table, idle).map(w => w.code)).not.toContain('handOverLimit');
  });

  test('a component that changes `handLimit` moves the limit the check runs against', () => {
    const table = hand(SEVEN, { technologies: ['technology:ps'] });
    lend(effectOf(table.pack, 'technology:ps')!, { tier: 'passive', modify: { handLimit: value => value + 1 } });
    expect(warningsOf(table, table.entry).map(w => w.code)).not.toContain('handOverLimit');
  });
});

describe('what a faction sheet, a secret or an Alliance note brings', () => {
  test('a hint of an ability, a secret objective and a mech is shown at its step for the player who has it, and for nobody else', () => {
    const table = bench({ faction: 'sol', start: { secrets: ['secretObjective:dtgs'] }, entries: [tactical(NEAR, {})] });
    const board = endOf(table);
    expect(hintsAt(table.pack, board, 'combat', ['me']).map(c => c.id)).toContain('secretObjective:dtgs');
    const ability = [...(table.pack.factions.sol.sheet?.abilities ?? [])].map(a => `ability:${a.id}`)[0];
    lend(effectOf(table.pack, ability)!, { tier: 'hint', hintAt: ['production'] });
    expect(hintsAt(table.pack, board, 'production', ['me']).map(c => c.id)).toContain(ability);
    expect(hintsAt(table.pack, board, 'invasion', ['me']).map(c => c.id)).not.toContain(ability);
  });

  test('an ability of a faction sheet is no card held, so naming it is no breach; its play is given the faction and checks it itself', () => {
    const entry = componentAction('ability:orbital_drop');
    const table = bench({ faction: 'letnev', entries: [entry] });
    const play = vi.fn();
    lend(effectOf(table.pack, 'ability:orbital_drop')!, { play });
    expect(warningsOf(table, entry).map(w => w.code)).not.toContain('componentNotHeld');
    expect(play.mock.calls[0][0].game.faction).toBe('letnev');
  });

  test('an Alliance note held brings its owner\'s commander while it is unlocked', () => {
    const note = 'promissory:<color>_an@a';
    const commander = 'leader:letnevcommander';
    const table = bench({
      faction: 'sol', expansions: ['pok'], entries: [tactical(NEAR, {})],
      game: { opponents: [{ id: 'a', faction: 'letnev', vp: 0, seat: 2, color: 2 }], start: { me: { promissory: [note] }, opponents: { a: { leaders: { [commander]: 'unlocked' } } } } },
    });
    expect(inForce(table.pack, table.game, endOf(table))).toContain(commander);
  });
});

describe('the codes made by the play of a component', () => {
  const CODES = ['componentUnresolved', 'playCondition', 'componentCondition', 'choiceOverLimit', 'placementOverLimit', 'warSunAbsent', 'replacementCost', 'factionTechCopied', 'relicFragmentsShort', 'systemOccupied', 'handOverLimit'];

  test('each has its file, a step the editor has a block for and both texts', () => {
    for (const code of CODES) {
      const def = EXTENSION_CODES.get(code);
      expect(def, code).toBeDefined();
      expect(def!.text.ru.length, code).toBeGreaterThan(10);
      expect(def!.text.en.length, code).toBeGreaterThan(10);
    }
    expect(EXTENSION_CODES.get('handOverLimit')!.rules).toEqual(['2.4', '2.4.1']);
  });
});
