import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, quote, TARGET, warningsOf } from '../kit';
import { id } from './nekrohero';

const RIVAL = 'o1';

/**
 * My cruiser stands in the target system, whose planet t1 (2/1) has the red specialty; a rival's infantry stands on it.
 * The Nekro hero is unlocked.
 */
const table = (entries: Entry[], faction = 'nekro') => bench({
  faction, expansions: ['pok'], units: { [TARGET]: { cruiser: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries,
  game: { opponents: [{ id: RIVAL, faction: 'rules-tester', vp: 0, seat: 2, color: 2 }], enemyGround: { t1: { [RIVAL]: { infantry: 1 } } } },
  edit: pack => { pack.planets.t1 = { ...pack.planets.t1, tech: ['warfare'] }; pack.planets.t2 = { ...pack.planets.t2, tech: ['biotic'] }; },
});
const hero = (planet = 't1', technology = 'technology:ps') => componentAction(id, { choices: { planet, technology } } as Partial<Entry>);

describe('leader:nekrohero UNIT.DSGN.FLAYESH', () => {
  // "Gain trade goods equal to the planet's combined resource and influence values"
  // Checks: the hero on t1 (2 resources, 1 influence) gives 3 trade goods.
  // Why the default count does not apply: the hero's own action gives the trade goods (a `play` with the planet chosen).
  test('leader:nekrohero gains trade goods of the planet\'s resources and influence', () => {
    const game = table([hero()]);
    quote(game.pack, id, "Gain trade goods equal to the planet's combined resource and influence values");
    expect(endOf(game).tradeGoods).toBe(3);
  });

  // Checks: the trade goods follow the planet chosen: t2 (1 resource, 3 influence) gives 4.
  test('leader:nekrohero on another planet gains that planet\'s value', () => {
    expect(endOf(table([hero('t2', 'technology:nm')])).tradeGoods).toBe(4);
  });

  // "... and gain 1 technology that matches the specialty of that planet."
  // Checks: the red technology chosen (Plasma Scoring) is held after the action.
  // Why the default count does not apply: the technology is gained by the hero, not researched, so it needs no
  // Technology card and Propagation does not turn it into tokens (Propagation note 1).
  test('leader:nekrohero gains the technology chosen, not replaced by Propagation', () => {
    expect(endOf(table([hero()])).holdings.technologies).toContain('technology:ps');
  });

  // "Destroy any other player's units on that planet."
  // Checks: the rival's infantry on t1 is gone after the action.
  test('leader:nekrohero destroys the other players\' units on the planet', () => {
    expect(endOf(table([hero()])).rivals?.[RIVAL]?.ground.t1?.infantry ?? 0).toBe(0);
  });

  // "Then, purge this card." LRR 51.12: a hero is purged once its ability is resolved.
  // Checks: a second play of the hero is warned of as not held.
  // Why the check is NOT redundant here: the hero is spent by its one action.
  test('leader:nekrohero is purged by its play: a second play is not held', () => {
    const again = hero();
    expectStanding(warningsOf(table([hero(), again]), again), 'componentNotHeld');
  });

  // Checks: the hero is the Nekro player's; another faction's play is warned of as not held.
  // Why the check is NOT redundant here: another faction does not hold the Nekro hero.
  test('leader:nekrohero not held by another faction: its play is warned of', () => {
    const play = hero();
    const game = bench({ faction: 'sol', expansions: ['pok'], entries: [play] });
    expectStanding(warningsOf(game, play), 'componentNotHeld');
  });

  test.todo('leader:nekrohero a planet without a specialty, or in a system without my units, is warned of: no warning code for the hero\'s choice yet');

  test('leader:nekrohero is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).nativePlay).toBeTypeOf('function');
  });
});
