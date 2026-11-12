import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './titanprototype';

const table = (entries: Entry[]) =>
  bench({ faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries, game: { planetControl: { h1: 'me', h2: 'me' } } });
const place = (structure: string, planetId: string) => componentAction(id, { choices: { player: 'me', structure, planetId } });

describe('relic:titanprototype JR-XS455-O', () => {
  // "choose a player, that player may spend 3 resources to place a structure on a planet they control."
  // Checks: chosen for myself with a PDS on h1, the action puts the PDS there.
  // Why it is counted here: a structure is otherwise placed by Construction or production (85.2); the relic places
  // one by its own action, so the replay must put it on the board.
  test.fails('relic:titanprototype places a structure on a planet I control', () => {
    const jr = table([place('pds', 'h1')]);
    quote(jr.pack, id, 'that player may spend 3 resources to place a structure on a planet they control');
    expect(endOf(jr).pds.h1).toBe(1);
  });

  // "If they do not, they gain 1 trade good."
  // Checks: chosen for myself without a structure, the action gives 1 trade good.
  test.fails('relic:titanprototype gives 1 trade good when no structure is placed', () => {
    expect(endOf(table([componentAction(id, { choices: { player: 'me' } })])).tradeGoods).toBe(1);
  });

  // "... on a planet they control."
  // Checks: a structure put on t1, which I do not control, is warned of (and placed all the same).
  // Why the check is NOT redundant here: the relic places only on a planet of the chosen player.
  test.fails('relic:titanprototype a structure on a planet I do not control is warned of', () => {
    const play = place('pds', 't1');
    expectStanding(warningsOf(table([play]), play), 'structureNotControlled');
  });

  // JR-XS455-O note 1: "JR-XS455-O is an agent. All rules that apply to agents (and leaders) apply to JR-XS455-O."
  // Checks: "Exhaust this agent": the relic is exhausted by its action, so a second action in the round is warned of.
  // Why the check is NOT redundant here: an exhausted agent cannot be used until it is readied (51.4, 34).
  test.fails('relic:titanprototype is exhausted by its action: a second one in the round is warned of', () => {
    const again = place('pds', 'h2');
    const jr = table([place('pds', 'h1'), again]);
    expect(endOf(jr).holdings.relics).toContain(id);
    expectStanding(warningsOf(jr, again), 'componentExhausted');
  });

  test.todo('relic:titanprototype "spend 3 resources": a component action has no payment of its own to check it against');
  test.todo('relic:titanprototype chosen for another player: their structure and trade good belong to their own state');

  test.fails('relic:titanprototype is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
